// --- FEEDBACK VISUAL E MODAIS ---
function mostrarCarregando(texto = "Carregando...") {
    document.getElementById('loading-text').textContent = texto;
    document.getElementById('loading-screen').classList.remove('hidden');
}


function esconderCarregando() {
    document.getElementById('loading-screen').classList.add('hidden');
}

function exibirMensagem(titulo, texto, tipo = 'sucesso', callback = null) {
    const modal = document.getElementById('message-modal');
    document.getElementById('message-icon').textContent = tipo === 'sucesso' ? "✅" : "⚠️";
    document.getElementById('message-title').textContent = titulo;
    document.getElementById('message-title').style.color = tipo === 'sucesso' ? "#2e7d32" : "#d32f2f";
    document.getElementById('message-text').textContent = texto;
    modal.classList.remove('hidden');
    document.getElementById('btn-message-ok').onclick = () => {
        modal.classList.add('hidden');
        if (callback) callback();
    };
}

// Carregar nomes dos alunos ao selecionar a série
document.getElementById('serieAluno').addEventListener('change', async (e) => {
    const serie = e.target.value;
    const nomeSelect = document.getElementById('nomeAluno');
    if (!serie) return;
    nomeSelect.innerHTML = "<option>Carregando nomes...</option>";
    mostrarCarregando("Carregando nomes de alunos...");
    try {
        const resp = await fetch(`${URL_API}?action=getAlunos&serie=${serie}`);
        const alunos = await resp.json();
        nomeSelect.innerHTML = '<option value="">Selecione seu nome</option>';
        alunos.forEach(a => {
            let opt = document.createElement('option');
            opt.value = a.nome;
            opt.dataset.eletiva = a.eletiva || "";
            opt.textContent = a.nome;
            nomeSelect.appendChild(opt);
        });
        nomeSelect.disabled = false;
    } catch (err) { exibirMensagem("Erro", "Falha ao carregar alunos.", "erro"); }
    finally { esconderCarregando(); }
});
const URL_API = "https://script.google.com/macros/s/AKfycbx9B2XwiCyrWFslC73yI28QXme-qrlEpY9fDoTCO--0I_I9DK9BfOvLbAE7p-Bx2b05/exec"; // Atualize com a URL do passo acima
let alunoAtual = { nome: "", serie: "", eletivaInscrita: "" };
let eletivasCache = [];
let isAdmin = false;

// --- FEEDBACK VISUAL E MODAIS ---
function mostrarCarregando(texto = "Carregando...") {
    document.getElementById('loading-text').textContent = texto;
    document.getElementById('loading-screen').classList.remove('hidden');
}


// --- FUNÇÕES DE CARREGAMENTO ---

document.getElementById('entrar-btn').onclick = () => {
    const sel = document.getElementById('nomeAluno');
    if (!sel.value) return exibirMensagem("Atenção", "Selecione seu nome!", "erro");

// --- FUNÇÕES ADMINISTRATIVAS E UTILITÁRIAS (ESCOPO GLOBAL) ---
function adicionarBotaoAdmin() {
    if (!isAdmin) return;
    if (document.getElementById('abrir-admin-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'abrir-admin-btn';
    btn.className = 'btn-secondary';
    btn.textContent = '⚙️ Painel de Gestão';
    btn.style.margin = '20px 0 0 0';
    btn.onclick = () => abrirPainelAdmin();
    document.getElementById('main-screen').prepend(btn);
}

function abrirPainelAdmin() {
    document.getElementById('admin-panel').classList.remove('hidden');
}

function fecharPainelAdmin() {
    document.getElementById('admin-panel').classList.add('hidden');
    limparFormularioEletiva();
}

function limparFormularioEletiva() {
    document.getElementById('adm-nome').value = '';
    document.getElementById('adm-desc').value = '';
    document.getElementById('adm-prof').value = '';
    document.getElementById('adm-vagas').value = '';
    document.getElementById('adm-img').value = '';
    document.getElementById('btn-salvar-eletiva').textContent = 'Salvar Eletiva';
    document.getElementById('btn-salvar-eletiva').dataset.editing = '';
}

async function salvarEletiva() {
    const nome = document.getElementById('adm-nome').value.trim();
    const desc = document.getElementById('adm-desc').value.trim();
    const prof = document.getElementById('adm-prof').value.trim();
    const vagas = parseInt(document.getElementById('adm-vagas').value);
    const img = document.getElementById('adm-img').value.trim();
    if (!nome || !desc || !prof || !vagas || vagas < 1) {
        exibirMensagem('Atenção', 'Preencha todos os campos corretamente!', 'erro');
        return;
    }
    mostrarCarregando('Salvando eletiva...');
    try {
        const editing = document.getElementById('btn-salvar-eletiva').dataset.editing;
        let action = editing ? 'editarEletiva' : 'criarEletiva';
        let payload = { action, nome, descricao: desc, professor: prof, vagasTotais: vagas, foto: img };
        if (editing) payload.nomeAntigo = editing;
        const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify(payload) });
        const res = await resp.json();
        if (res.status === 'success') {
            exibirMensagem('Sucesso!', editing ? 'Eletiva editada!' : 'Eletiva criada!', 'sucesso', () => {
                fecharPainelAdmin();
                carregarEletivas();
            });
        } else {
            exibirMensagem('Erro', res.message || 'Falha ao salvar.', 'erro');
        }
    } catch (e) {
        exibirMensagem('Erro', 'Erro ao salvar.', 'erro');
    } finally {
        esconderCarregando();
    }
}

function editarEletiva(eletiva) {
    document.getElementById('adm-nome').value = eletiva.nome;
    document.getElementById('adm-desc').value = eletiva.descricao;
    document.getElementById('adm-prof').value = eletiva.professor;
    document.getElementById('adm-vagas').value = eletiva.vagasTotais;
    document.getElementById('adm-img').value = eletiva.foto || '';
    document.getElementById('btn-salvar-eletiva').textContent = 'Salvar Alterações';
    document.getElementById('btn-salvar-eletiva').dataset.editing = eletiva.nome;
    abrirPainelAdmin();
}

function removerEletiva(eletiva) {
    exibirConfirmacao('Remover Eletiva', `Deseja remover a eletiva "${eletiva.nome}"?`, async () => {
        mostrarCarregando('Removendo eletiva...');
        try {
            const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ action: 'removerEletiva', nome: eletiva.nome }) });
            const res = await resp.json();
            if (res.status === 'success') {
                exibirMensagem('Removida', 'Eletiva removida com sucesso!', 'sucesso', carregarEletivas);
            } else {
                exibirMensagem('Erro', res.message || 'Falha ao remover.', 'erro');
            }
        } catch (e) {
            exibirMensagem('Erro', 'Erro ao remover.', 'erro');
        } finally {
            esconderCarregando();
        }
    }, null);
}

// Eventos do painel admin
document.getElementById('btn-salvar-eletiva').onclick = salvarEletiva;
document.getElementById('fechar-admin').onclick = fecharPainelAdmin;
    isAdmin = false;
    alunoAtual = { 
        nome: sel.value, 
        serie: document.getElementById('serieAluno').value, 
        eletivaInscrita: sel.options[sel.selectedIndex].dataset.eletiva 
    };
    irParaMain(`Bem-vindo(a), ${alunoAtual.nome}!`);
};

function irParaMain(titulo) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('welcome').textContent = titulo;
    const status = document.getElementById('status-aluno');
    status.textContent = isAdmin ? "Modo Administrador" : (alunoAtual.eletivaInscrita ? `Sua eletiva: ${alunoAtual.eletivaInscrita}` : "Escolha sua eletiva.");
    status.style.background = isAdmin ? "#e3f2fd" : (alunoAtual.eletivaInscrita ? "#c8e6c9" : "#ffecb3");
    carregarEletivas();
}

async function carregarEletivas() {
    mostrarCarregando("Buscando eletivas...");
    try {
        const resp = await fetch(`${URL_API}?action=getEletivas`);
        eletivasCache = await resp.json();
        const list = document.getElementById('eletivas-list');
        list.innerHTML = "";
        eletivasCache.forEach(el => {
            const card = document.createElement('div');
            card.className = "eletiva-card";
            let visual = el.foto && (el.foto.startsWith('data:image') || el.foto.startsWith('http')) 
                ? `<img src="${el.foto}" class="img-eletiva">` : `<div class="emoji-eletiva">${el.foto || '📘'}</div>`;
            card.innerHTML = `${visual}<strong>${el.nome}</strong><div>${el.vagasRestantes} vagas</div>`;
            card.onclick = () => abrirDetalhes(el);
            // Botões editar/remover (apenas admin)
            if (isAdmin) {
                const btns = document.createElement('div');
                btns.style.marginTop = '10px';
                btns.style.display = 'flex';
                btns.style.gap = '8px';
                const btnEdit = document.createElement('button');
                btnEdit.textContent = '✏️ Editar';
                btnEdit.className = 'btn-secondary';
                btnEdit.onclick = (ev) => {
                    ev.stopPropagation();
                    editarEletiva(el);
                };
                const btnRem = document.createElement('button');
                btnRem.textContent = '🗑️ Remover';
                btnRem.className = 'btn-danger';
                btnRem.onclick = (ev) => {
                    ev.stopPropagation();
                    removerEletiva(el);
                };
                btns.appendChild(btnEdit);
                btns.appendChild(btnRem);
                card.appendChild(btns);
            }
            list.appendChild(card);
        });
    } finally { esconderCarregando(); }
// Editar eletiva: preenche formulário e abre painel
function editarEletiva(eletiva) {
    document.getElementById('adm-nome').value = eletiva.nome;
    document.getElementById('adm-desc').value = eletiva.descricao;
    document.getElementById('adm-prof').value = eletiva.professor;
    document.getElementById('adm-vagas').value = eletiva.vagasTotais;
    document.getElementById('adm-img').value = eletiva.foto || '';
    document.getElementById('btn-salvar-eletiva').textContent = 'Salvar Alterações';
    document.getElementById('btn-salvar-eletiva').dataset.editing = eletiva.nome;
    abrirPainelAdmin();
}

// Remover eletiva
function removerEletiva(eletiva) {
    exibirConfirmacao('Remover Eletiva', `Deseja remover a eletiva "${eletiva.nome}"?`, async () => {
        mostrarCarregando('Removendo eletiva...');
        try {
            const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ action: 'removerEletiva', nome: eletiva.nome }) });
            const res = await resp.json();
            if (res.status === 'success') {
                exibirMensagem('Removida', 'Eletiva removida com sucesso!', 'sucesso', carregarEletivas);
            } else {
                exibirMensagem('Erro', res.message || 'Falha ao remover.', 'erro');
            }
        } catch (e) {
            exibirMensagem('Erro', 'Erro ao remover.', 'erro');
        } finally {
            esconderCarregando();
        }
    }, null);
}
}

async function abrirDetalhes(el) {
    mostrarCarregando("Carregando detalhes da eletiva...");
    try {
        document.getElementById('sobre-nome').textContent = el.nome;
        document.getElementById('sobre-descricao').textContent = el.descricao;
        document.getElementById('sobre-prof').textContent = `Professor: ${el.professor}`;
        document.getElementById('sobre-vagas').textContent = `Vagas: ${el.vagasRestantes}/${el.vagasTotais}`;
        const btnInsc = document.getElementById('btn-inscrever-confirmar');
        const areaAdmin = document.getElementById('admin-view-lista');
        if (isAdmin) {
            btnInsc.classList.add('hidden');
            areaAdmin.classList.remove('hidden');
            const listaUL = document.getElementById('lista-alunos-inscritos');
            listaUL.innerHTML = "<li>Carregando...</li>";
            try {
                mostrarCarregando("Carregando lista de inscritos...");
                const resp = await fetch(`${URL_API}?action=getInscritosPorEletiva&eletiva=${encodeURIComponent(el.nome)}`);
                const alunos = await resp.json();
                listaUL.innerHTML = alunos.length > 0 ? alunos.map(a => `<li>${a.nome} (${a.serie})</li>`).join('') : "<li>Nenhum inscrito.</li>";
            } catch (e) { listaUL.innerHTML = "<li>Erro ao carregar lista.</li>"; }
            finally { esconderCarregando(); }
        } else {
            areaAdmin.classList.add('hidden');
            btnInsc.classList.remove('hidden');
            btnInsc.disabled = (alunoAtual.eletivaInscrita === el.nome || el.vagasRestantes <= 0);
            btnInsc.textContent = el.vagasRestantes <= 0 ? "Esgotado" : "Confirmar Escolha ✓";
            btnInsc.onclick = () => finalizarInscricao(el.nome);
        }
        document.getElementById('sobre-banner').classList.remove('hidden');
    } finally {
        esconderCarregando();
    }
}


function exibirConfirmacao(titulo, texto, callbackSim, callbackNao) {
    // Cria modal se não existir
    let modal = document.getElementById('confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'banner-sobre';
        modal.innerHTML = `
            <div class="banner-content" style="text-align: center; max-width: 400px;">
                <div id="confirm-icon" style="font-size: 2.5rem; margin-bottom: 15px;">❓</div>
                <h3 id="confirm-title" style="margin-bottom: 10px;"></h3>
                <p id="confirm-text" style="margin-bottom: 20px; color: #666;"></p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-confirm-sim" class="btn-primary">Sim</button>
                    <button id="btn-confirm-nao" class="btn-secondary">Não</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-text').textContent = texto;
    modal.classList.remove('hidden');
    document.getElementById('btn-confirm-sim').onclick = () => {
        modal.classList.add('hidden');
        if (callbackSim) callbackSim();
    };
    document.getElementById('btn-confirm-nao').onclick = () => {
        modal.classList.add('hidden');
        if (callbackNao) callbackNao();
    };
}

async function finalizarInscricao(nova) {
    exibirConfirmacao(
        "Confirmação",
        `Confirmar inscrição em: ${nova}?`,
        async () => {
            mostrarCarregando("Gravando inscrição...");
            try {
                const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ action: "registrarInscricao", nome: alunoAtual.nome, serie: alunoAtual.serie, novaEletiva: nova }) });
                const res = await resp.json();
                if (res.status === "success") {
                    // Esconde o banner de detalhes antes de mostrar mensagem de sucesso
                    document.getElementById('sobre-banner').classList.add('hidden');
                    exibirMensagem("Sucesso!", "Inscrição realizada!", "sucesso", () => window.location.reload());
                }
            } catch (err) { exibirMensagem("Erro", "Erro ao salvar.", "erro"); }
            finally { esconderCarregando(); }
        },
        () => {} // Não faz nada se cancelar
    );
}

// --- IMPRESSÃO ---
document.getElementById('btn-imprimir').onclick = () => {
    mostrarCarregando("Preparando impressão...");
    setTimeout(() => {
        const nome = document.getElementById('sobre-nome').textContent;
        const itens = document.querySelectorAll('#lista-alunos-inscritos li');
        let linhas = "";
        itens.forEach((li, i) => {
            if (li.textContent.includes("Carregando") || li.textContent.includes("Nenhum")) return;
            const t = li.textContent;
            const n = t.includes('(') ? t.substring(0, t.lastIndexOf('(')) : t;
            const s = t.includes('(') ? t.substring(t.lastIndexOf('(')+1, t.lastIndexOf(')')) : "-";
            linhas += `<tr><td>${i+1}</td><td>${n}</td><td>${s}</td><td style="width:150px"></td></tr>`;
        });
        const win = window.open('', '', 'width=800,height=600');
        win.document.write(`<html><head><style>table{width:100%;border-collapse:collapse;} th,td{border:1px solid #000;padding:8px;}</style></head>
            <body><h2>EE João Roberto Moreira</h2><h3>Eletiva: ${nome}</h3>
            <table><thead><tr><th>Nº</th><th>Nome</th><th>Série</th><th>Assinatura</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`);
        win.document.close();
        setTimeout(() => {
            esconderCarregando();
            win.print();
        }, 500);
    }, 200);
};

// ATALHO ADMIN

function exibirPromptSenha(titulo, callback) {
    let modal = document.getElementById('senha-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'senha-modal';
        modal.className = 'banner-sobre';
        modal.innerHTML = `
            <div class="banner-content" style="text-align: center; max-width: 400px;">
                <div style="font-size: 2.5rem; margin-bottom: 15px;">🔒</div>
                <h3 id="senha-title" style="margin-bottom: 10px;"></h3>
                <input id="senha-input" type="password" class="input-edit" placeholder="Digite a senha" style="margin-bottom: 20px;" />
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-senha-ok" class="btn-primary">Entrar</button>
                    <button id="btn-senha-cancelar" class="btn-secondary">Cancelar</button>
                </div>
                <p id="senha-erro" style="color: #d32f2f; margin-top: 10px; display: none;">Senha incorreta!</p>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('senha-title').textContent = titulo;
    document.getElementById('senha-input').value = '';
    document.getElementById('senha-erro').style.display = 'none';
    modal.classList.remove('hidden');
    document.getElementById('senha-input').focus();
    document.getElementById('btn-senha-ok').onclick = () => {
        const val = document.getElementById('senha-input').value;
        if (callback) callback(val, modal);
    };
    document.getElementById('btn-senha-cancelar').onclick = () => {
        modal.classList.add('hidden');
    };
    document.getElementById('senha-input').onkeydown = (ev) => {
        if (ev.key === 'Enter') document.getElementById('btn-senha-ok').click();
    };
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyA") {
        exibirPromptSenha("Senha do Administrador", (pass, modal) => {
            if (pass === "admin2026") {
                modal.classList.add('hidden');
                isAdmin = true;
                irParaMain("Modo Administrador");
            } else {
                document.getElementById('senha-erro').style.display = '';
            }
        });
    }
});

document.getElementById('fechar-sobre').onclick = () => document.getElementById('sobre-banner').classList.add('hidden');