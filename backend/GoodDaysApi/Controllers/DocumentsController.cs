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
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string userId, [FromForm] string category)
    {
        if (file == null) return BadRequest("file required");
        var uploads = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads");
        if (!Directory.Exists(uploads)) Directory.CreateDirectory(uploads);
        var name = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
        var path = Path.Combine(uploads, name);
        using (var fs = new FileStream(path, FileMode.Create)) { await file.CopyToAsync(fs); }

        var doc = new ThesisDocument { Id = Guid.NewGuid(), UserId = userId, Name = file.FileName, Category = category, FilePath = $"/uploads/{name}" };
        _db.ThesisDocuments.Add(doc);
        await _db.SaveChangesAsync();
        return Ok(new { doc.Id, doc.Name, url = doc.FilePath, doc.Category, doc.Date });
    }
}
