using System;
using ASideNote.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ASideNote.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260218000000_NotebookContentJsonDropNotebookPages")]
    public partial class NotebookContentJsonDropNotebookPages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContentJson",
                table: "Notebooks",
                type: "jsonb",
                nullable: false,
                defaultValue: "{\"type\":\"doc\",\"content\":[]}");

            migrationBuilder.DropTable(name: "NotebookPages");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotebookPages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Content = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NotebookId = table.Column<Guid>(type: "uuid", nullable: false),
                    PageIndex = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotebookPages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotebookPages_Notebooks_NotebookId",
                        column: x => x.NotebookId,
                        principalTable: "Notebooks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotebookPages_NotebookId",
                table: "NotebookPages",
                column: "NotebookId");

            migrationBuilder.CreateIndex(
                name: "IX_NotebookPages_NotebookId_PageIndex",
                table: "NotebookPages",
                columns: new[] { "NotebookId", "PageIndex" },
                unique: true);

            migrationBuilder.DropColumn(
                name: "ContentJson",
                table: "Notebooks");
        }
    }
}
