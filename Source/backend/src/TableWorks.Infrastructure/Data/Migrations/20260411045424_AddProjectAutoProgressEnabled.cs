using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ASideNote.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectAutoProgressEnabled : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoProgressEnabled",
                table: "Projects",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoProgressEnabled",
                table: "Projects");
        }
    }
}
