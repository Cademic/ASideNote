using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ASideNote.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectFolders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ProjectFolderId",
                table: "Notebooks",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProjectFolderId",
                table: "Boards",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProjectFolders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectFolders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectFolders_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notebooks_ProjectFolderId",
                table: "Notebooks",
                column: "ProjectFolderId");

            migrationBuilder.CreateIndex(
                name: "IX_Boards_ProjectFolderId",
                table: "Boards",
                column: "ProjectFolderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectFolders_ProjectId",
                table: "ProjectFolders",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectFolders_ProjectId_Name",
                table: "ProjectFolders",
                columns: new[] { "ProjectId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Boards_ProjectFolders_ProjectFolderId",
                table: "Boards",
                column: "ProjectFolderId",
                principalTable: "ProjectFolders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Notebooks_ProjectFolders_ProjectFolderId",
                table: "Notebooks",
                column: "ProjectFolderId",
                principalTable: "ProjectFolders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Boards_ProjectFolders_ProjectFolderId",
                table: "Boards");

            migrationBuilder.DropForeignKey(
                name: "FK_Notebooks_ProjectFolders_ProjectFolderId",
                table: "Notebooks");

            migrationBuilder.DropTable(
                name: "ProjectFolders");

            migrationBuilder.DropIndex(
                name: "IX_Notebooks_ProjectFolderId",
                table: "Notebooks");

            migrationBuilder.DropIndex(
                name: "IX_Boards_ProjectFolderId",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "ProjectFolderId",
                table: "Notebooks");

            migrationBuilder.DropColumn(
                name: "ProjectFolderId",
                table: "Boards");
        }
    }
}
