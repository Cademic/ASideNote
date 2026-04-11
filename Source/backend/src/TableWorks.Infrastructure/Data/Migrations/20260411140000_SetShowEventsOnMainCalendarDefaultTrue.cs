using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ASideNote.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SetShowEventsOnMainCalendarDefaultTrue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Projects" SET "ShowEventsOnMainCalendar" = true;
                ALTER TABLE "Projects" ALTER COLUMN "ShowEventsOnMainCalendar" SET DEFAULT true;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Projects" ALTER COLUMN "ShowEventsOnMainCalendar" SET DEFAULT false;
                """);
        }
    }
}
