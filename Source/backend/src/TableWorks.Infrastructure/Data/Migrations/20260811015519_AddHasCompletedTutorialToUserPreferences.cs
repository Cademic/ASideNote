using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ASideNote.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHasCompletedTutorialToUserPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasCompletedTutorial",
                table: "UserPreferences",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Existing users predate the onboarding tour and should not see it retroactively.
            // Only users who sign up after this migration runs should default to "not completed".
            migrationBuilder.Sql(
                """
                UPDATE "UserPreferences" SET "HasCompletedTutorial" = true;

                INSERT INTO "UserPreferences" ("Id", "UserId", "Theme", "HasCompletedTutorial", "UpdatedAt")
                SELECT gen_random_uuid(), u."Id", 'System', true, now()
                FROM "Users" u
                LEFT JOIN "UserPreferences" p ON p."UserId" = u."Id"
                WHERE p."Id" IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasCompletedTutorial",
                table: "UserPreferences");
        }
    }
}
