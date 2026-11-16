using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace umfg.programacaoiii.minimalapi._2026.Migrations
{
    /// <inheritdoc />
    public partial class MigrationAdicionaCompleto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsCompleto",
                table: "Lembrete",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsCompleto",
                table: "Lembrete");
        }
    }
}
