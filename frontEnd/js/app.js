// ========================================
// CONFIGURAÇÃO
// ========================================

const API_URL = "https://localhost:7063";

let paginaAtual = 1;

//total de paginas do ultimo filtro aplicado
let totalPaginasAtual = 1;

//estado atual da ordenação da tabela
const ordenacao = {
    ordem: "DataCadastro",
    direcao: "DESC",
};


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const formulario = document.getElementById("formulario");
const formLembrete = document.getElementById("formLembrete");

const lembreteId = document.getElementById("lembreteId");
const descricao = document.getElementById("descricao");

const listaLembretes = document.getElementById("listaLembretes");
const mensagemVazia = document.getElementById("mensagemVazia");

const filtroDescricao = document.getElementById("filtroDescricao");
const tamanhoPagina = document.getElementById("tamanhoPagina");

const filtroDataCadastroInicial = document.getElementById("filtroDataCadastroInicial");
const filtroDataCadastroFinal = document.getElementById("filtroDataCadastroFinal");
const filtroDataEdicaoInicial = document.getElementById("filtroDataEdicaoInicial");
const filtroDataEdicaoFinal = document.getElementById("filtroDataEdicaoFinal");

const camposData = [
    filtroDataCadastroInicial,
    filtroDataCadastroFinal,
    filtroDataEdicaoInicial,
    filtroDataEdicaoFinal,
];

const totalRegistros = document.getElementById("totalRegistros");
const campoPagina = document.getElementById("campoPagina");
const totalPaginasElemento = document.getElementById("totalPaginas");

const btnImprimir = document.getElementById("btnImprimir");
const btnNovo = document.getElementById("btnNovo");
const btnCancelar = document.getElementById("btnCancelar");
const btnFiltrar = document.getElementById("btnFiltrar");

const btnAnterior = document.getElementById("btnAnterior");
const btnProximo = document.getElementById("btnProximo");

const tituloFormulario = document.getElementById("tituloFormulario");

const modalExcluir = document.getElementById("modalExcluir");
const btnCancelarExcluir = document.getElementById("btnCancelarExcluir");
const btnConfirmarExcluir = document.getElementById("btnConfirmarExcluir");


// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    atualizarIndicadoresOrdenacao();
    filtrarLembretes();
});

// ========================================
// MONTAGEM DOS PARÂMETROS DE FILTRO
// (usada por /lembretes/filtro e /lembretes/imprimir)
// ========================================
function montarParametrosFiltro() {
    const params = new URLSearchParams();

    params.append("NumeroPagina", paginaAtual);
    params.append("TamanhoPagina", tamanhoPagina.value);
    params.append("Descricao", filtroDescricao.value);

    params.append("Ordem", ordenacao.ordem);
    params.append("Direcao", ordenacao.direcao);

    //datas só são enviadas quando preenchidas (podem ficar vazias)
    if (filtroDataCadastroInicial.value) {
        params.append("DataCadastroInicial", filtroDataCadastroInicial.value);
    }

    if (filtroDataCadastroFinal.value) {
        params.append("DataCadastroFinal", filtroDataCadastroFinal.value);
    }

    if (filtroDataEdicaoInicial.value) {
        params.append("DataAtualizacaoInicial", filtroDataEdicaoInicial.value);
    }

    if (filtroDataEdicaoFinal.value) {
        params.append("DataAtualizacaoFinal", filtroDataEdicaoFinal.value);
    }

    return params;
}

// ========================================
// VALIDAÇÃO DAS DATAS DO FILTRO
// Retorna false quando alguma regra é violada
// ========================================
function limparCamposInvalidos() {
    camposData.forEach(campo => campo.classList.remove("campo-invalido"));
}

function marcarCampoInvalido(...elementos) {
    elementos.forEach(elemento => elemento.classList.add("campo-invalido"));
}

function validarDatasFiltro() {
    limparCamposInvalidos();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const pares = [
        { inicial: filtroDataCadastroInicial, final: filtroDataCadastroFinal, nome: "criação" },
        { inicial: filtroDataEdicaoInicial, final: filtroDataEdicaoFinal, nome: "edição" },
    ];

    const erros = [];

    for (const par of pares) {
        //sufixo T00:00:00 garante parsing no fuso local
        const dataInicial = par.inicial.value ? new Date(`${par.inicial.value}T00:00:00`) : null;
        const dataFinal = par.final.value ? new Date(`${par.final.value}T00:00:00`) : null;

        if (dataInicial && dataInicial > hoje) {
            marcarCampoInvalido(par.inicial);
            erros.push(`Data de ${par.nome} maior que a atual`);
        }

        if (dataFinal && dataFinal > hoje) {
            marcarCampoInvalido(par.final);
            erros.push(`Data de ${par.nome} maior que a atual`);
        }

        if (dataInicial && dataFinal && dataInicial > dataFinal) {
            marcarCampoInvalido(par.inicial, par.final);
            erros.push(`Data de ${par.nome} inicial maior que a data final`);
        }
    }

    if (erros.length > 0) {
        //Set elimina mensagens repetidas quando o mesmo erro vale para os dois pares
        mostrarToast([...new Set(erros)].join("\n"), "alerta");
        return false;
    }

    return true;
}

// ========================================
// GET /lembretes/filtro
// ========================================
async function filtrarLembretes() {
    try {
        if (!validarDatasFiltro()) {
            return;
        }

        const params = montarParametrosFiltro();

        console.log('filtro-> params', params.toString());

        const response = await fetch(
            `${API_URL}/lembretes/filtro?${params}`
        );

        if (!response.ok) {
            throw new Error("Erro ao filtrar lembretes.");
        }

        const resultado = await response.json();

        const totalPaginas = Math.max(
            1,
            Math.ceil(resultado.total / resultado.tamanhoPagina)
        );

        //filtros novos podem reduzir os resultados e deixar a página atual fora do alcance:
        //volta para a última página existente e busca novamente
        if (paginaAtual > totalPaginas) {
            paginaAtual = totalPaginas;

            await filtrarLembretes();
            return;
        }

        totalPaginasAtual = totalPaginas;

        renderizarLembretes(resultado.lembretes);

        totalRegistros.textContent =
            `${resultado.total} registros`;

        campoPagina.value = paginaAtual;
        totalPaginasElemento.textContent = totalPaginas;

        btnAnterior.disabled =
            paginaAtual <= 1;

        btnProximo.disabled =
            paginaAtual >= totalPaginas;

    } catch (error) {

        console.error(error);

        mostrarToast(
            "Erro ao realizar o filtro."
        );
    }
}

// ========================================
// GET /lembretes/imprimir
// ========================================
async function imprimirLembretes() {
    try {
        if (!validarDatasFiltro()) {
            return;
        }

        const params = montarParametrosFiltro();

        const response = await fetch(
            `${API_URL}/lembretes/imprimir?${params}`
        );

        if (!response.ok) {
            throw new Error("Erro ao gerar o relatório.");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "relatorio-lembretes.pdf";

        document.body.appendChild(a)
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 10000)

    } catch (error) {

        console.error(error);

        mostrarToast(
            "Erro ao realizar o filtro."
        );
    }
}

// ========================================
// POST /lembretes
// ========================================

async function criarLembrete() {
    try {

        const dados = { 
            descricao: descricao.value
        };

        const response = await fetch(
            `${API_URL}/lembretes`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            }
        );

        if (!response.ok) {
            throw new Error("Erro ao criar lembrete.");
        }

        mostrarToast("Lembrete criado com sucesso!");

        fecharFormulario();

        await filtrarLembretes();

    } catch (error) {

        console.error(error);

        mostrarToast("Não foi possível criar o lembrete.");
    }
}


// ========================================
// GET /lembretes/{id}
// ========================================
async function buscarLembrete(id) {

    try {

        const response = await fetch(
            `${API_URL}/lembretes/${id}`
        );

        if (!response.ok) {
            throw new Error("Lembrete não encontrado.");
        }

        const lembrete = await response.json();

        lembreteId.value = lembrete.id;
        descricao.value = lembrete.descricao;

        tituloFormulario.textContent = "Editar lembrete";

        formulario.classList.remove("hidden");

    } catch (error) {

        console.error(error);

        mostrarToast(
            "Não foi possível buscar o lembrete."
        );
    }
}


// ========================================
// PUT /lembretes/{id}
// ========================================

async function atualizarLembrete() {

    try {

        const dados = {
            descricao: descricao.value
        };

        const response = await fetch(
            `${API_URL}/lembretes/${lembreteId.value}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(dados)
            }
        );

        if (!response.ok) {
            throw new Error("Erro ao atualizar.");
        }

        mostrarToast(
            "Lembrete atualizado com sucesso!"
        );

        fecharFormulario();

        await filtrarLembretes();

    } catch (error) {

        console.error(error);

        mostrarToast(
            "Não foi possível atualizar o lembrete."
        );
    }
}


// ========================================
// DELETE /lembretes/{id}
// ========================================
let lembreteParaExcluir = null;

function excluirLembrete(id) {
    lembreteParaExcluir = id;

    modalExcluir.classList.remove("hidden");
}

function fecharModalExcluir() {
    lembreteParaExcluir = null;

    modalExcluir.classList.add("hidden");
}

async function confirmarExclusao() {
    if (!lembreteParaExcluir) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/lembretes/${lembreteParaExcluir}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error("Erro ao excluir.");
        }

        mostrarToast(
            "Lembrete excluído com sucesso!"
        );

        fecharModalExcluir();

        await filtrarLembretes();

    } catch (error) {

        console.error(error);

        mostrarToast(
            "Não foi possível excluir o lembrete."
        );
    }
}


// ========================================
// RENDERIZAÇÃO
// ========================================
function renderizarLembretes(lembretes) {
    listaLembretes.innerHTML = "";

    if (!lembretes || lembretes.length === 0) {
        mensagemVazia.classList.remove("hidden");

        return;
    }

    mensagemVazia.classList.add("hidden");

    lembretes.forEach(lembrete => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                ${lembrete.descricao}
            </td>

            <td>
                ${formatarData(lembrete.dataCadastro)}
            </td>

            <td>
                ${formatarData(lembrete.dataAtualizacao)}
            </td>

            <td>
                <span class="status ${
                    lembrete.isAtivo
                        ? "status-ativo"
                        : "status-inativo"
                }">
                    ${
                        lembrete.isAtivo
                            ? "Ativo"
                            : "Inativo"
                    }
                </span>
            </td>

            <td>
                <div class="actions">

                    <button
                        class="btn btn-edit"
                        onclick="buscarLembrete('${lembrete.id}')">
                        Editar
                    </button>

                    <button
                        class="btn btn-danger"
                        onclick="excluirLembrete('${lembrete.id}')">
                        Excluir
                    </button>

                </div>
            </td>
        `;

        listaLembretes.appendChild(tr);
    });
}


// ========================================
// FORMULÁRIO
// ========================================
btnImprimir.addEventListener("click", () => {
    console.log('click-> imprimir lembretes');
    imprimirLembretes();
});

btnNovo.addEventListener("click", () => {
    abrirFormularioNovo();
});


btnCancelar.addEventListener("click", () => {
    fecharFormulario();
});

btnConfirmarExcluir.addEventListener("click", () => {
    confirmarExclusao();
});

btnCancelarExcluir.addEventListener("click", () => {
    fecharModalExcluir();
});

formLembrete.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!descricao.value.trim()) {
        mostrarToast("Informe uma descrição.");

        return;
    }

    if (lembreteId.value) {
        await atualizarLembrete();
    } else {
        await criarLembrete();
    }
});


function abrirFormularioNovo() {
    lembreteId.value = "";
    descricao.value = "";

    tituloFormulario.textContent = "Novo lembrete";

    formulario.classList.remove("hidden");
    descricao.focus();
}

function fecharFormulario() {
    formulario.classList.add("hidden");
    formLembrete.reset();
    lembreteId.value = "";
}

// ========================================
// FILTRO
// ========================================
btnFiltrar.addEventListener("click", () => {
    paginaAtual = 1;
    filtrarLembretes();
});

//ao alterar o tamanho da página, busca novamente desde a primeira página
tamanhoPagina.addEventListener("change", () => {
    paginaAtual = 1;
    filtrarLembretes();
});

filtroDescricao.addEventListener("keyup", event => {
    if (event.key === "Enter") {
        paginaAtual = 1;
        filtrarLembretes();
    }
});

//ao alterar o valor de um campo de data, ele volta ao visual normal
camposData.forEach(campo => {
    const removerInvalido = () => campo.classList.remove("campo-invalido");

    campo.addEventListener("input", removerInvalido);
    campo.addEventListener("change", removerInvalido);
});

// ========================================
// ORDENAÇÃO
// ========================================
function atualizarIndicadoresOrdenacao() {
    document.querySelectorAll(".btn-ordenacao").forEach(botao => {
        const ativo = botao.dataset.ordem === ordenacao.ordem;

        botao.classList.toggle("ativo", ativo);
        botao.textContent = ativo
            ? (ordenacao.direcao === "ASC" ? "▲" : "▼")
            : "⇅";
    });
}

document.querySelectorAll(".btn-ordenacao").forEach(botao => {
    botao.addEventListener("click", () => {
        const campo = botao.dataset.ordem;

        if (ordenacao.ordem === campo) {
            //mesma coluna: inverte a direção
            ordenacao.direcao = ordenacao.direcao === "ASC" ? "DESC" : "ASC";
        } else {
            //coluna nova: ativa em ordem crescente
            ordenacao.ordem = campo;
            ordenacao.direcao = "ASC";
        }

        atualizarIndicadoresOrdenacao();

        paginaAtual = 1;
        filtrarLembretes();
    });
});

// ========================================
// PAGINAÇÃO
// ========================================
btnAnterior.addEventListener("click", () => {
    if (paginaAtual > 1) {
        paginaAtual--;
        filtrarLembretes();
    }
});

btnProximo.addEventListener("click", () => {
    paginaAtual++;
    filtrarLembretes();
});

//ir para uma página digitada ao pressionar Enter
campoPagina.addEventListener("keydown", event => {
    if (event.key !== "Enter") {
        return;
    }

    event.preventDefault();

    let paginaEscolhida = parseInt(campoPagina.value, 10);

    //valor inválido/vazio: restaura a página atual
    if (isNaN(paginaEscolhida)) {
        campoPagina.value = paginaAtual;
        return;
    }

    //menor que 1 -> primeira página | maior que o total -> última página
    paginaEscolhida = Math.min(
        Math.max(paginaEscolhida, 1),
        totalPaginasAtual
    );

    //mesma página: apenas restaura o valor normalizado
    if (paginaEscolhida === paginaAtual) {
        campoPagina.value = paginaAtual;
        return;
    }

    paginaAtual = paginaEscolhida;
    filtrarLembretes();
});


// ========================================
// UTILITÁRIOS
// ========================================
function formatarData(data) {

    if (!data) {
        return "-";
    }

    return new Date(data).toLocaleString(
        "pt-BR"
    );
}


function mostrarToast(mensagem, tipo = "info") {
    const toast = document.getElementById("toast");

    toast.textContent = mensagem;

    //remove variantes anteriores antes de aplicar a nova
    toast.classList.remove("hidden", "toast-alerta");

    if (tipo === "alerta") {
        toast.classList.add("toast-alerta");
    }

    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
        toast.classList.remove("toast-alerta");
    }, 3000);
}