using System;
using System.IO;
using System.Threading.Tasks;
using GoodDaysApi.Data;
using GoodDaysApi.Models;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace GoodDaysApi.Controllers;

[ApiController]
[Route("api/thesis/documents")]
public class DocumentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    public DocumentsController(AppDbContext db, IWebHostEnvironment env) { _db = db; _env = env; }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetByUser(string userId)
    {
        var list = await _db.ThesisDocuments.Where(d => d.UserId == userId).ToListAsync();
        return Ok(list);
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload([FromForm] UploadDocumentRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            return BadRequest("File required");

        var uploads = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads");

        if (!Directory.Exists(uploads))
            Directory.CreateDirectory(uploads);

        var name = Guid.NewGuid().ToString() + Path.GetExtension(request.File.FileName);

        var path = Path.Combine(uploads, name);

        using (var fs = new FileStream(path, FileMode.Create))
        {
            await request.File.CopyToAsync(fs);
        }

        var doc = new ThesisDocument
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            Name = request.File.FileName,
            Category = request.Category,
            FilePath = "/uploads/" + name,
            Date = DateTime.UtcNow
        };

        _db.ThesisDocuments.Add(doc);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            doc.Id,
            doc.Name,
            url = doc.FilePath,
            doc.Category,
            doc.Date
        });
    }
}

public class UploadDocumentRequest
{
    public IFormFile File { get; set; }

    public string UserId { get; set; }

    public string Category { get; set; }
}