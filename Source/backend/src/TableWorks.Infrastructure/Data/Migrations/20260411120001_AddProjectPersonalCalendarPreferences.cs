using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ASideNote.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectPersonalCalendarPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "OwnerShowOnPersonalCalendar",
                table: "Projects",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowOnPersonalCalendar",
                table: "ProjectMembers",
                type: "boolean",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OwnerShowOnPersonalCalendar",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ShowOnPersonalCalendar",
                table: "ProjectMembers");
        }
    }
}
