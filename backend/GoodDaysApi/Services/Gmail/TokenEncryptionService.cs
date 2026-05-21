using System.Security.Cryptography;
using System.Text;

namespace GoodDaysApi.Services.Gmail;

public class TokenEncryptionService : ITokenEncryptionService
{
    private readonly byte[] _key;

    public TokenEncryptionService(IConfiguration config)
    {
        var rawKey = config["Encryption:Key"];
        if (string.IsNullOrWhiteSpace(rawKey))
        {
            var jwtKey = config["Jwt:Key"] ?? "development-only-gmail-token-encryption-key";
            using var sha = SHA256.Create();
            _key = sha.ComputeHash(Encoding.UTF8.GetBytes(jwtKey));
            return;
        }

        _key = Convert.FromBase64String(rawKey);
        if (_key.Length != 32)
        {
            throw new InvalidOperationException("Encryption:Key must be a 32-byte Base64 key.");
        }
    }

    public string Encrypt(string plainText)
    {
        var plaintextBytes = Encoding.UTF8.GetBytes(plainText);
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV();
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        var cipherBytes = encryptor.TransformFinalBlock(plaintextBytes, 0, plaintextBytes.Length);

        var payload = new byte[aes.IV.Length + cipherBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, payload, 0, aes.IV.Length);
        Buffer.BlockCopy(cipherBytes, 0, payload, aes.IV.Length, cipherBytes.Length);

        return Convert.ToBase64String(payload);
    }

    public string Decrypt(string cipherText)
    {
        var payload = Convert.FromBase64String(cipherText);
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        var iv = new byte[16];
        var cipherBytes = new byte[payload.Length - 16];

        Buffer.BlockCopy(payload, 0, iv, 0, 16);
        Buffer.BlockCopy(payload, 16, cipherBytes, 0, cipherBytes.Length);

        using var decryptor = aes.CreateDecryptor(aes.Key, iv);
        var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
        return Encoding.UTF8.GetString(plainBytes);
    }
}
