using Microsoft.EntityFrameworkCore;
using QuestPDF;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using umfg.programacaoiii.minimalapi._2026.Contexto;
using umfg.programacaoiii.minimalapi._2026.DTO;
using umfg.programacaoiii.minimalapi._2026.Entidades;

namespace umfg.programacaoiii.minimalapi._2026;

public class Program
{    
    //m�todo de startup do projeto
    public static void Main(string[] args)
    {
        //variavel padr�o do .net permite definir as caracteristicas que a api ir� ter
        //ex: autentica��o e autoriza��o via JWT / qual banco de dados
        var builder = WebApplication.CreateBuilder(args);
        var connectionString = builder.Configuration["ConnectionString"] ?? string.Empty;
        Console.WriteLine(connectionString);
        //aqui configuramos a conex�o da API com o banco de dados
        builder.Services
            .AddDbContext<MySqlContexto>(options => options.UseMySQL(connectionString));
            //.AddDbContext<MySqlContexto>(options => options.UseMySQL("Server=localhost;Port=3308;Database=umfg_lembrete_develop;Uid=root;Pwd=root;"));

        //implementacao do CORS para permitir que a aplica��o frontend acesse a API (localhost)
        //no mundo real, restrinja o acesso apenas para o dominio do frontend conhecido. Ex.: .WithOrigins("https://app.empresa.com.br")
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                policy
                    .AllowAnyOrigin()
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        //aqui a aplica��o � constru�da
        var app = builder.Build();

        app.MapPost("/lembretes", async (Lembrete lembrete, MySqlContexto contexto) =>
        {
            await contexto.Lembrete.AddAsync(lembrete);
            await contexto.SaveChangesAsync();

            return Results.Created($"/lembretes/{lembrete.Id}", lembrete);
        });

        app.MapGet("/lembretes/{id}", async (string id, MySqlContexto contexto) =>
        {
            if (string.IsNullOrWhiteSpace(id))
                return Results.BadRequest("id invalido!");

            return await contexto.Lembrete.FirstOrDefaultAsync(x => x.Id == Guid.Parse(id) && x.IsAtivo) 
            is Lembrete lembrete ? Results.Ok(lembrete) : Results.NotFound();
        });

        app.MapGet("/lembretes", async (MySqlContexto contexto) =>
        {
            return await contexto.Lembrete.Where(x => x.IsAtivo).ToListAsync();            
        });

        app.MapGet("/lembretes/filtro", async ([AsParameters] LembreteQueryDTO.LembreteQueryRequestDTO dto, MySqlContexto contexto) =>
        {
            if (dto.NumeroPagina <= 0 || dto.TamanhoPagina <= 0)
                return Results.BadRequest("P�gina e tamanho da p�gina s�o obrigat�rios.");

            var (lembretes, total) = await FiltrarLembretes(dto, contexto);

            var resultado = new LembreteQueryDTO.LembreteQueryResponseDTO()
            {
                Total = total,
                NumeroPagina = dto.NumeroPagina,
                TamanhoPagina = dto.TamanhoPagina,
                Lembretes = lembretes,
            };

            return Results.Ok(resultado);
        });

        //Biblioteca -> QuestPDF
        Settings.License = LicenseType.Community;

        app.MapGet("/lembretes/imprimir", async ([AsParameters] LembreteQueryDTO.LembreteQueryRequestDTO dto, MySqlContexto contexto) =>
        {
            if (dto.NumeroPagina <= 0 || dto.TamanhoPagina <= 0)
                return Results.BadRequest("P�gina e tamanho da p�gina s�o obrigat�rios.");

            if (dto.NumeroPagina <= 0 || dto.TamanhoPagina <= 0)
                return Results.BadRequest("P�gina e tamanho da p�gina s�o obrigat�rios.");

            var (lembretes, total) = await FiltrarLembretes(dto, contexto);

            var documento = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.PageColor(Color.FromHex("#FFFFFF"));

                    page.Header()
                        .Text("Relatório de Lembretes")
                        .SemiBold()
                        .FontSize(20)
                        .FontColor(Colors.Blue.Medium);

                    page
                        .Content()
                        .PaddingVertical(10)
                        .Column(column =>
                        {
                            column.Spacing(10);
                            column.Item().Text($"Gerado em: {DateTime.Now.ToLocalTime()}");

                            column
                                .Item()
                                .Table(tabela =>
                                {
                                    tabela.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn();
                                        columns.ConstantColumn(110);
                                        columns.ConstantColumn(110);                                        
                                        columns.ConstantColumn(80);                                        
                                    });

                                    tabela.Header(header =>
                                    {
                                        header.Cell().Text("Descrição").SemiBold();
                                        header.Cell().Text("Cadastro").SemiBold();
                                        header.Cell().Text("Atualização").SemiBold();
                                        header.Cell().Text("Status").SemiBold();
                                    });

                                    foreach (var lembrete in lembretes)
                                    {
                                        tabela.Cell().Text(lembrete.Descricao).FontSize(10);
                                        tabela.Cell().Text(lembrete.DataCadastro.ToLocalTime()).FontSize(10);
                                        tabela.Cell().Text(lembrete.DataAtualizacao.ToLocalTime()).FontSize(10);
                                        tabela.Cell()
                                            .Text(lembrete.IsAtivo ? (lembrete.IsCompleto ? "Completo" : "Ativo") : "Inativo")
                                            .FontSize(10)
                                            .FontColor(lembrete.IsAtivo ? (lembrete.IsCompleto ? Colors.Blue.Medium : Colors.Green.Medium) : Colors.Red.Medium);
                                    }
                                });
                        });

                    page.Footer().AlignCenter().Text(x => x.CurrentPageNumber());
                });
            });

            return Results.File(documento.GeneratePdf(), "application/pdf", "relatorio-lembretes.pdf");
        });


        app.MapDelete("/lembretes/{id}", async (string id, MySqlContexto contexto) =>
        {
            var lembrete = await contexto.Lembrete.FindAsync(Guid.Parse(id));

            //conceito de fail first
            if (lembrete is null)
                return Results.NotFound();

            lembrete.SetAtivo(false);
            lembrete.Update();

            contexto.Lembrete.Update(lembrete);
            await contexto.SaveChangesAsync();

            return Results.NoContent();
        });

        app.MapPut("/lembretes/{id}", async (string id, LembreteDTO dto, MySqlContexto contexto) =>
        {
            var lembreteExistente = await contexto.Lembrete.FindAsync(Guid.Parse(id));

            if (lembreteExistente is null)
                return Results.NotFound();

            lembreteExistente.SetDescricao(dto.Descricao);
            lembreteExistente.SetCompleto(dto.IsCompleto);
            lembreteExistente.Update();

            contexto.Lembrete.Update(lembreteExistente);
            await contexto.SaveChangesAsync();

            return Results.Ok(lembreteExistente);
        });

        //aqui habilitamos as funcionalidades da api
        app.UseHttpsRedirection();

        //habilitar o uso da regra de CORS
        app.UseCors("Frontend");

        //a api � iniciada de fato
        app.Run();
        //tudo que for colocado ap�s o run ser� executado somente quando a api for parada
    }

    private static async Task<(List<Lembrete>, long)>FiltrarLembretes(
        LembreteQueryDTO.LembreteQueryRequestDTO dto, MySqlContexto contexto)
    {
        var query = contexto.Lembrete
                .AsNoTracking()
                .Where(x => x.IsAtivo);

        //busca por descri��o com tratamento de caracteres especiais para LIKE
        if (!string.IsNullOrWhiteSpace(dto.Descricao))
        {
            var termo = dto.Descricao.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
            query = query.Where(x => EF.Functions.Like(x.Descricao, $"%{termo}%"));
        }

        // Filtros opcionais: nulo = sem limite naquela extremidade
        // a data final inclui o dia inteiro (Date.AddDays(1))
        if (dto.DataCadastroInicial.HasValue)
            query = query.Where(x => x.DataCadastro >= dto.DataCadastroInicial.Value);

        if (dto.DataCadastroFinal.HasValue)
            query = query.Where(x => x.DataCadastro < dto.DataCadastroFinal.Value.Date.AddDays(1));

        if (dto.DataAtualizacaoInicial.HasValue)
            query = query.Where(x => x.DataAtualizacao >= dto.DataAtualizacaoInicial.Value);

        if (dto.DataAtualizacaoFinal.HasValue)
            query = query.Where(x => x.DataAtualizacao < dto.DataAtualizacaoFinal.Value.Date.AddDays(1));

        //valida a direcao (qualquer valor invalido volta para DESC)
        var direcao = string.IsNullOrWhiteSpace(dto.Direcao)
            ? "DESC"
            : dto.Direcao.Trim().ToUpperInvariant();

        if (direcao != "ASC" && direcao != "DESC")
            direcao = "DESC";

        //ordena��o
        var ordem = string.IsNullOrWhiteSpace(dto.Ordem)
            ? "DataCadastro"
            : dto.Ordem.Trim();

        //mapeia o campo de ordenacao informado para a expressao correta
        query = (ordem.ToLowerInvariant(), direcao) switch
        {
            ("descricao", "ASC") => query.OrderBy(x => x.Descricao),
            ("descricao", "DESC") => query.OrderByDescending(x => x.Descricao),
            ("dataatualizacao", "ASC") => query.OrderBy(x => x.DataAtualizacao),
            ("dataatualizacao", "DESC") => query.OrderByDescending(x => x.DataAtualizacao),
            ("datacadastro", "ASC") => query.OrderBy(x => x.DataCadastro),
            //status composto: Inativo < Ativo < Completo (ASC) | inverso (DESC)
            ("isativo", "ASC") => query.OrderBy(x => x.IsAtivo).ThenBy(x => x.IsCompleto),
            ("isativo", "DESC") => query.OrderByDescending(x => x.IsAtivo).ThenByDescending(x => x.IsCompleto),
            _ => query.OrderByDescending(x => x.DataCadastro), //padrao: mais recentes primeiro
        };

        // pagina��o
        var pular = (dto.NumeroPagina - 1) * dto.TamanhoPagina;
        var lembretes = await query.Skip(pular).Take(dto.TamanhoPagina).ToListAsync();
        var total = await query.CountAsync();

        return (lembretes, total);
    }
}