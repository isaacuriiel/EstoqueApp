/* ============================================================
   BLOCO 1 - Estado, Persistência, UI e Login
   ============================================================ */

/* -------------------------
   Estado global
------------------------- */
let produtos = [];           // Lista de produtos cadastrados
let produtoEditando = null;  // Produto em edição
let notificacoes = [];       // Lista de notificações
let usuarioAtual = null;     // Usuário logado (admin, estoque ou CEO)

/* -------------------------
   Persistência em LocalStorage
------------------------- */
function salvarLocalStorage() {
  localStorage.setItem("estoque", JSON.stringify(produtos));
}
function carregarLocalStorage() {
  const dados = localStorage.getItem("estoque");
  if (dados) produtos = JSON.parse(dados);

  const sessao = localStorage.getItem("sessaoUsuario");
  if (sessao) usuarioAtual = JSON.parse(sessao);

  atualizarUIUsuario();
  atualizarTabela();
}

/* -------------------------
   Atualização da UI de usuário
------------------------- */
function atualizarUIUsuario() {
  const status = document.getElementById("usuarioAtual");
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  if (usuarioAtual) {
    status.textContent = `Logado: ${usuarioAtual.nome} (${usuarioAtual.role})`;
    btnLogin.style.display = "none";
    btnLogout.style.display = "inline-block";
  } else {
    status.textContent = "Não logado";
    btnLogin.style.display = "inline-block";
    btnLogout.style.display = "none";
  }
}

/* -------------------------
   Controle de Modais
------------------------- */
function abrirModal(id) {
  document.getElementById(id).style.display = "block";
  if (id === "modalNotificacoes") atualizarNotificacoes();
  if (id === "modalRelatorios") preencherRelatorios();
}
function fecharModal(id) {
  document.getElementById(id).style.display = "none";
}

/* -------------------------
   Login / Logout
------------------------- */
function login(usuario, senha) {
  const usuarios = {
    admin: { senha: "1234", role: "administrador" },
    estoque: { senha: "5678", role: "estoquista" },
    isaac: { senha: "9999", role: "CEO" } // Login especial de CEO: Isaac Uriel
  };
  const registro = usuarios[usuario];
  if (registro && registro.senha === senha) {
    usuarioAtual = { role: registro.role, nome: usuario };
    localStorage.setItem("sessaoUsuario", JSON.stringify(usuarioAtual));
    atualizarUIUsuario();
    fecharModal("modalLogin");
  } else {
    alert("❌ Usuário ou senha inválidos!");
  }
}
function executarLogin() {
  const u = document.getElementById("usuarioLogin").value.trim();
  const s = document.getElementById("senhaLogin").value.trim();
  login(u, s);
}
function logout() {
  usuarioAtual = null;
  localStorage.removeItem("sessaoUsuario");
  atualizarUIUsuario();
  alert("🔒 Sessão encerrada com sucesso!");
}
function verificarPermissao(acao) {
  if (!usuarioAtual) {
    alert("⚠️ Faça login primeiro!");
    return false;
  }
  if (acao === "excluir" && usuarioAtual.role !== "administrador" && usuarioAtual.role !== "CEO") {
    alert("❌ Apenas administradores ou CEO podem excluir produtos!");
    return false;
  }
  return true;
}

/* -------------------------
   Utilitários
------------------------- */
// Formata data ISO para DD/MM/YYYY
function formatarData(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}
// Escapa caracteres perigosos (HTML injection)
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  })[c]);
}
/* ============================================================
   BLOCO 2 - Cadastro, Edição, Exclusão, Movimentação e Tabela
   ============================================================ */

/* -------------------------
   Cadastro de Produto
------------------------- */
function adicionarProduto() {
  const codigo = document.getElementById("codigoProduto").value.trim();
  const nome = document.getElementById("nomeProduto").value.trim();
  const categoria = document.getElementById("categoriaProduto").value.trim();
  const precoVenda = parseFloat(document.getElementById("precoVendaProduto").value);
  const quantidade = parseInt(document.getElementById("quantidadeProduto").value);
  const validade = document.getElementById("validadeProduto").value;
  const limite = parseInt(document.getElementById("limiteProduto").value);

  // Validação de código único
  if (produtos.some(p => p.codigo === codigo)) {
    alert("⚠️ Já existe um produto com este código!");
    return;
  }
  if (!codigo || !nome || !categoria || isNaN(precoVenda) || isNaN(quantidade) || !validade || isNaN(limite)) {
    alert("⚠️ Preencha todos os campos corretamente.");
    return;
  }

  const produto = {
    codigo, nome, categoria,
    precoVenda: Number(precoVenda.toFixed(2)),
    quantidade, validade, limite,
    vendas: 0,
    historico: []
  };

  produtos.push(produto);
  salvarLocalStorage();
  atualizarTabela();
  fecharModal("modalProduto");
}

/* -------------------------
   Edição de Produto
------------------------- */
function editarProduto(codigo) {
  const produto = produtos.find(p => p.codigo === codigo);
  if (!produto) return;
  produtoEditando = produto;

  document.getElementById("editCodigo").value = produto.codigo;
  document.getElementById("editNome").value = produto.nome;
  document.getElementById("editCategoria").value = produto.categoria;
  document.getElementById("editPrecoVenda").value = produto.precoVenda;
  document.getElementById("editQuantidade").value = produto.quantidade;
  document.getElementById("editValidade").value = produto.validade;
  document.getElementById("editLimite").value = produto.limite;

  abrirModal("modalEditar");
}
function salvarEdicao() {
  if (!produtoEditando) return;
  const nome = document.getElementById("editNome").value.trim();
  const categoria = document.getElementById("editCategoria").value.trim();
  const precoVenda = parseFloat(document.getElementById("editPrecoVenda").value);
  const quantidade = parseInt(document.getElementById("editQuantidade").value);
  const validade = document.getElementById("editValidade").value;
  const limite = parseInt(document.getElementById("editLimite").value);

  if (!nome || !categoria || isNaN(precoVenda) || isNaN(quantidade) || !validade || isNaN(limite)) {
    alert("⚠️ Preencha todos os campos corretamente.");
    return;
  }

  produtoEditando.nome = nome;
  produtoEditando.categoria = categoria;
  produtoEditando.precoVenda = Number(precoVenda.toFixed(2));
  produtoEditando.quantidade = quantidade;
  produtoEditando.validade = validade;
  produtoEditando.limite = limite;

  salvarLocalStorage();
  atualizarTabela();
  fecharModal("modalEditar");
}

/* -------------------------
   Exclusão de Produto
------------------------- */
function excluirProduto(codigo) {
  if (!verificarPermissao("excluir")) return;
  if (confirm("Deseja realmente excluir este produto?")) {
    produtos = produtos.filter(p => p.codigo !== codigo);
    salvarLocalStorage();
    atualizarTabela();
  }
}

/* -------------------------
   Movimentação de Estoque
------------------------- */
function registrarEntrada() {
  const codigo = document.getElementById("codigoEntrada").value.trim();
  const qtd = parseInt(document.getElementById("quantidadeEntrada").value);
  const produto = produtos.find(p => p.codigo === codigo);

  if (produto && !isNaN(qtd) && qtd > 0) {
    produto.quantidade += qtd;
    produto.historico.push({ tipo: "entrada", quantidade: qtd, data: new Date().toISOString() });
    salvarLocalStorage();
    atualizarTabela();
  } else {
    alert("⚠️ Produto não encontrado ou quantidade inválida!");
  }
  fecharModal("modalEntrada");
}
function registrarSaida() {
  const codigo = document.getElementById("codigoSaida").value.trim();
  const qtd = parseInt(document.getElementById("quantidadeSaida").value);
  const produto = produtos.find(p => p.codigo === codigo);

  if (produto && !isNaN(qtd) && qtd > 0) {
    if (produto.quantidade >= qtd) {
      produto.quantidade -= qtd;
      produto.vendas += qtd;
      produto.historico.push({ tipo: "saida", quantidade: qtd, data: new Date().toISOString() });
      salvarLocalStorage();
      atualizarTabela();
    } else {
      alert("⚠️ Quantidade insuficiente em estoque!");
    }
  } else {
    alert("⚠️ Produto não encontrado ou quantidade inválida!");
  }
  fecharModal("modalSaida");
}

/* -------------------------
   Atualização da Tabela
------------------------- */
function atualizarTabela() {
  const tbody = document.querySelector("#tabelaEstoque tbody");
  tbody.innerHTML = "";
  const hoje = new Date();

  // Agrupar por categoria
  const categorias = {};
  produtos.forEach(p => {
    const cat = p.categoria || "Sem categoria";
    if (!categorias[cat]) categorias[cat] = [];
    categorias[cat].push(p);
  });

  // Renderizar cada categoria
  for (const categoria in categorias) {
    const trCategoria = document.createElement("tr");
    trCategoria.innerHTML = `<td colspan="9">${esc(categoria)}</td>`;
    tbody.appendChild(trCategoria);

    categorias[categoria].forEach(p => {
      const tr = document.createElement("tr");

      let classe = "";
      if (p.validade) {
        const val = new Date(p.validade);
        const diffDias = (val - hoje) / (1000 * 60 * 60 * 24);
        if (!Number.isNaN(diffDias)) {
          if (diffDias < 0) classe = "vencido";
          else if (diffDias <= 7) classe = "validade-alerta";
        }
      }
      if (p.quantidade <= p.limite) classe = "estoque-baixo";
      if (classe) tr.classList.add(classe);

      tr.innerHTML = `
        <td>${esc(p.codigo)}</td>
        <td>${esc(p.nome)}</td>
        <td>${esc(p.categoria)}</td>
        <td>R$ ${Number(p.precoVenda).toFixed(2)}</td>
        <td>${p.quantidade}</td>
        <td>${formatarData(p.validade)}</td>
        <td>${p.limite}</td>
        <td>
          <button onclick="editarProduto('${esc(p.codigo)}')">✏️ Editar</button>
          <button onclick="excluirProduto('${esc(p.codigo)}')">🗑️ Excluir</button>
        </td>
        <td>
          <button onclick="mostrarDetalhes('${esc(p.codigo)}')">🔎 Detalhes</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}
/* ============================================================
   BLOCO 3 - Notificações, Relatórios, Detalhes, Backup, Dark Mode e Inicialização
   ============================================================ */

/* -------------------------
   Notificações
------------------------- */
function atualizarNotificacoes() {
  const lista = document.getElementById("listaNotificacoes");
  lista.innerHTML = "";
  const hoje = new Date();
  notificacoes = [];

  // Verificar validade e estoque
  produtos.forEach(p => {
    const val = new Date(p.validade);
    const diffDias = (val - hoje) / (1000 * 60 * 60 * 24);

    if (!Number.isNaN(diffDias)) {
      if (diffDias < 0) notificacoes.push({ tipo: "vencido", produto: p, timestamp: Date.now() });
      else if (diffDias <= 7) notificacoes.push({ tipo: "proximo", produto: p, timestamp: Date.now() });
    }
    if (p.quantidade <= p.limite) notificacoes.push({ tipo: "baixo", produto: p, timestamp: Date.now() });
  });

  // Filtrar notificações (mantém vencidos e últimos 24h)
  notificacoes = notificacoes.filter(n => n.tipo === "vencido" || (Date.now() - n.timestamp) < 24 * 60 * 60 * 1000);

  // Renderizar lista
  if (notificacoes.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhum alerta no momento.";
    lista.appendChild(li);
  } else {
    notificacoes.forEach(n => {
      const li = document.createElement("li");
      if (n.tipo === "vencido") {
        li.classList.add("vencido");
        li.textContent = `⚠️ ${n.produto.nome} (cód: ${n.produto.codigo}) venceu em ${formatarData(n.produto.validade)}`;
      } else if (n.tipo === "proximo") {
        li.classList.add("proximo");
        li.textContent = `⏳ ${n.produto.nome} (cód: ${n.produto.codigo}) vence em ${formatarData(n.produto.validade)}`;
      } else if (n.tipo === "baixo") {
        li.classList.add("estoque-baixo");
        li.textContent = `📉 ${n.produto.nome} (cód: ${n.produto.codigo}) estoque baixo (${n.produto.quantidade})`;
      }
      lista.appendChild(li);
    });
  }
}
function limparNotificacoes() {
  // Mantém apenas vencidos
  notificacoes = notificacoes.filter(n => n.tipo === "vencido");
  atualizarNotificacoes();
}

/* -------------------------
   Relatórios
------------------------- */
function preencherRelatorios() {
  const destino = document.getElementById("relatoriosConteudo");
  const maisVendidos = [...produtos].sort((a, b) => b.vendas - a.vendas).slice(0, 5);
  const menosVendidos = [...produtos].sort((a, b) => a.vendas - b.vendas).slice(0, 5);
  const parados = produtos.filter(p => p.vendas === 0);

  destino.innerHTML = `
    <h3>Mais vendidos</h3>
    <ul>
      ${maisVendidos.length ? maisVendidos.map(p => `<li>${esc(p.nome)} (${esc(p.codigo)}) — ${p.vendas} unidades</li>`).join("") : "<li>Nenhum</li>"}
    </ul>
    <h3>Menos vendidos</h3>
    <ul>
      ${menosVendidos.length ? menosVendidos.map(p => `<li>${esc(p.nome)} (${esc(p.codigo)}) — ${p.vendas} unidades</li>`).join("") : "<li>Nenhum</li>"}
    </ul>
    <h3>Parados (sem vendas)</h3>
    <ul>
      ${parados.length ? parados.map(p => `<li>${esc(p.nome)} (${esc(p.codigo)})</li>`).join("") : "<li>Nenhum</li>"}
    </ul>
  `;
}

/* -------------------------
   Detalhes do Produto
------------------------- */
function mostrarDetalhes(codigo) {
  const p = produtos.find(x => x.codigo === codigo);
  if (!p) return;
  const destino = document.getElementById("detalhesConteudo");
  destino.innerHTML = `
    <p><strong>Nome:</strong> ${esc(p.nome)}</p>
    <p><strong>Código:</strong> ${esc(p.codigo)}</p>
    <p><strong>Categoria:</strong> ${esc(p.categoria)}</p>
    <p><strong>Preço venda:</strong> R$ ${Number(p.precoVenda).toFixed(2)}</p>
    <p><strong>Quantidade:</strong> ${p.quantidade}</p>
    <p><strong>Validade:</strong> ${formatarData(p.validade)}</p>
    <p><strong>Limite mínimo:</strong> ${p.limite}</p>
    <h4>Histórico</h4>
    <ul>
      ${p.historico.length
        ? p.historico.map(h => `<li>${h.tipo} de ${h.quantidade} em ${formatarData(h.data.slice(0,10))}</li>`).join("")
        : "<li>Sem movimentações</li>"}
    </ul>
  `;
  abrirModal("modalDetalhes");
}

/* -------------------------
   Backup
------------------------- */
function exportarBackup() {
  const dados = JSON.stringify(produtos, null, 2);
  const blob = new Blob([dados], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "estoque_backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* -------------------------
   Dark Mode
------------------------- */
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

/* -------------------------
   Inicialização
------------------------- */
window.addEventListener("DOMContentLoaded", carregarLocalStorage);
