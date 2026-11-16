namespace umfg.programacaoiii.minimalapi._2026.Entidades;

public sealed class Lembrete
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Descricao { get; private set; } = string.Empty;
    public DateTime DataCadastro { get; private set; } = DateTime.Now;
    public DateTime DataAtualizacao { get; private set; } = DateTime.Now;
    public bool IsAtivo { get; private set; } = true;

    /// <summary>
    /// Categoria "Completo". Independente do IsAtivo:
    /// um lembrete Ativo ou Completo permanece visivel; Inativo continua sendo exclusao (soft delete).
    /// </summary>
    public bool IsCompleto { get; private set; } = false;

    public Lembrete(string descricao)
    {
        ArgumentNullException.ThrowIfNullOrWhiteSpace(descricao);
        Descricao = descricao;
    }

    internal void SetDescricao(string descricao) => Descricao = descricao ?? throw new ArgumentNullException(nameof(descricao));
    internal void SetAtivo(bool isAtivo) => IsAtivo = isAtivo;
    internal void SetCompleto(bool isCompleto) => IsCompleto = isCompleto;
    internal void Update() => DataAtualizacao = DateTime.Now;
}