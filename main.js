const URL_API = "https://script.google.com/macros/s/AKfycbxIaMTopxrsRHWdEn3Ap0HT26L0wRb_2jsEVWRYJmX9o8XlHNXpOGpCXCCz2k62MpYq/exec"; // ATUALIZE ESTA URL APÓS A IMPLANTAÇÃO
let alunoAtual = { nome: "", serie: "", eletivaInscrita: "" };
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-salvar-eletiva').onclick = salvarEletiva;
    document.getElementById('fechar-admin').onclick = fecharPainelAdmin;
    document.getElementById('fechar-sobre').onclick = () => document.getElementById('sobre-banner').classList.add('hidden');
    document.getElementById('serieAluno').addEventListener('change', carregarNomesAlunos);
    document.getElementById('entrar-btn').onclick = logar;
});

// --- SISTEMA DE LOGIN ---
async function carregarNomesAlunos(e) {
    const serie = e.target.value;
    const nomeSelect = document.getElementById('nomeAluno');
    if (!serie) return;
    nomeSelect.innerHTML = "<option>Carregando...</option>";
    nomeSelect.disabled = true;
    mostrarCarregando("Buscando alunos...");
    try {
        const resp = await fetch(`${URL_API}?action=getAlunos&serie=${serie}`, { redirect: 'follow' });
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
    } catch (err) { exibirMensagem("Erro", "Erro ao carregar dados.", "erro"); }
    finally { esconderCarregando(); }
}

function logar() {
    const sel = document.getElementById('nomeAluno');
    if (!sel.value) return exibirMensagem("Atenção", "Selecione seu nome!", "erro");
    alunoAtual = { 
        nome: sel.value, 
        serie: document.getElementById('serieAluno').value, 
        eletivaInscrita: sel.options[sel.selectedIndex].dataset.eletiva 
    };
    irParaMain(`Bem-vindo, ${alunoAtual.nome}!`);
}

function irParaMain(titulo) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('welcome').textContent = titulo;
    const status = document.getElementById('status-aluno');
    status.textContent = isAdmin ? "Modo Administrador" : (alunoAtual.eletivaInscrita ? `Sua eletiva: ${alunoAtual.eletivaInscrita}` : "Escolha sua eletiva.");
    status.style.background = isAdmin ? "#e3f2fd" : (alunoAtual.eletivaInscrita ? "#c8e6c9" : "#ffecb3");
    if (isAdmin) adicionarBotaoAdmin();
    carregarEletivas();
}

// --- ELETIVAS E INSCRIÇÃO ---
async function carregarEletivas() {
    mostrarCarregando("Carregando eletivas...");
    try {
        const resp = await fetch(`${URL_API}?action=getEletivas`, { redirect: 'follow' });
        const eletivas = await resp.json();
        const list = document.getElementById('eletivas-list');
        list.innerHTML = "";
        eletivas.forEach(el => {
            const card = document.createElement('div');
            card.className = "eletiva-card";
            const visual = el.foto && el.foto.startsWith('http') ? `<img src="${el.foto}" class="img-eletiva">` : `<div class="emoji-eletiva">${el.foto || '📘'}</div>`;
            card.innerHTML = `${visual}<strong>${el.nome}</strong><div>${el.vagasRestantes} vagas</div>`;
            card.onclick = () => abrirDetalhes(el);
            if (isAdmin) {
                const btns = document.createElement('div');
                btns.style.marginTop = '10px';
                btns.innerHTML = `<button class="btn-secondary" onclick="event.stopPropagation(); editarEletiva(${JSON.stringify(el).replace(/"/g, '&quot;')})">✏️ Editar</button>
                                  <button class="btn-secondary" style="background:#ffcdd2" onclick="event.stopPropagation(); removerEletiva('${el.nome}')">🗑️ Deletar</button>`;
                card.appendChild(btns);
            }
            list.appendChild(card);
        });
    } finally { esconderCarregando(); }
}

function abrirDetalhes(el) {
    document.getElementById('sobre-nome').textContent = el.nome;
    document.getElementById('sobre-descricao').textContent = el.descricao;
    document.getElementById('sobre-prof').textContent = `Professor: ${el.professor}`;
    document.getElementById('sobre-vagas').textContent = `Vagas: ${el.vagasRestantes}/${el.vagasTotais}`;
    const btn = document.getElementById('btn-inscrever-confirmar');
    
    if (!isAdmin) {
        btn.classList.remove('hidden');
        btn.disabled = (alunoAtual.eletivaInscrita === el.nome || el.vagasRestantes <= 0);
        btn.textContent = el.vagasRestantes <= 0 ? "Vagas Esgotadas" : "Confirmar Inscrição ✓";
        btn.onclick = () => {
            if (alunoAtual.eletivaInscrita && alunoAtual.eletivaInscrita !== el.nome) {
                exibirConfirmacao("Trocar Eletiva", `Você já está em "${alunoAtual.eletivaInscrita}". Deseja trocar para "${el.nome}"?`, () => registrar(el.nome));
            } else { registrar(el.nome); }
        };
    } else { btn.classList.add('hidden'); }
    document.getElementById('sobre-banner').classList.remove('hidden');
}

async function registrar(nova) {
    mostrarCarregando("Gravando inscrição...");
    try {
        const resp = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ action: "registrarInscricao", nome: alunoAtual.nome, serie: alunoAtual.serie, novaEletiva: nova }) });
        const res = await resp.json();
        if (res.status === "success") {
            exibirMensagem("Sucesso!", "Inscrição realizada com sucesso!", "sucesso", () => window.location.reload());
        } else { exibirMensagem("Erro", res.message, "erro"); }
    } catch { exibirMensagem("Erro", "Falha na inscrição.", "erro"); }
    finally { esconderCarregando(); }
}

// --- ADMINISTRAÇÃO ---
async function salvarEletiva() {
    const nome = document.getElementById('adm-nome').value.trim();
    const desc = document.getElementById('adm-desc').value.trim();
    const prof = document.getElementById('adm-prof').value.trim();
    const vagas = document.getElementById('adm-vagas').value;
    const img = document.getElementById('adm-img').value;

    if (!nome || !desc || !prof || !vagas) return exibirMensagem("Atenção", "Preencha todos os campos obrigatórios!", "erro");

    mostrarCarregando("Salvando...");
    const editing = document.getElementById('btn-salvar-eletiva').dataset.editing;
    const payload = { action: editing ? "editarEletiva" : "criarEletiva", nome, descricao: desc, professor: prof, vagasTotais: parseInt(vagas), foto: img, nomeAntigo: editing };

    try {
        await fetch(URL_API, { method: 'POST', body: JSON.stringify(payload) });
        exibirMensagem("Sucesso!", "Dados salvos!", "sucesso", () => {
            fecharPainelAdmin();
            carregarEletivas();
        });
    } catch { exibirMensagem("Erro", "Falha ao salvar.", "erro"); }
    finally { esconderCarregando(); }
}

function editarEletiva(el) {
    document.getElementById('adm-nome').value = el.nome;
    document.getElementById('adm-desc').value = el.descricao;
    document.getElementById('adm-prof').value = el.professor;
    document.getElementById('adm-vagas').value = el.vagasTotais;
    document.getElementById('adm-img').value = el.foto || "";
    document.getElementById('btn-salvar-eletiva').dataset.editing = el.nome;
    document.getElementById('btn-salvar-eletiva').textContent = "Salvar Alterações";
    abrirPainelAdmin();
}

function removerEletiva(nome) {
    exibirConfirmacao("Deletar", `Tem certeza que deseja deletar "${nome}"? Os alunos inscritos ficarão sem eletiva.`, async () => {
        mostrarCarregando("Deletando...");
        try {
            await fetch(URL_API, { method: 'POST', body: JSON.stringify({ action: "removerEletiva", nome }) });
            exibirMensagem("Sucesso", "Eletiva deletada com sucesso!", "sucesso", carregarEletivas);
        } finally { esconderCarregando(); }
    });
}

// --- UTILITÁRIOS ---
function mostrarCarregando(t) { document.getElementById('loading-text').textContent = t; document.getElementById('loading-screen').classList.remove('hidden'); }
function esconderCarregando() { document.getElementById('loading-screen').classList.add('hidden'); }

function exibirMensagem(tit, tex, tipo, cb) {
    const modal = document.getElementById('message-modal');
    document.getElementById('message-icon').textContent = tipo === 'sucesso' ? "✅" : "⚠️";
    document.getElementById('message-title').textContent = tit;
    document.getElementById('message-text').textContent = tex;
    modal.classList.remove('hidden');
    document.getElementById('btn-message-ok').onclick = () => { modal.classList.add('hidden'); if(cb) cb(); };
}

function exibirConfirmacao(tit, tex, cb) {
    const modal = document.createElement('div');
    modal.className = 'banner-sobre';
    modal.innerHTML = `<div class="banner-content" style="text-align:center"><h3>${tit}</h3><p>${tex}</p>
    <button class="btn-primary" id="conf-sim">Confirmar</button><button class="btn-secondary" id="conf-nao" style="margin-top:10px">Cancelar</button></div>`;
    document.body.appendChild(modal);
    document.getElementById('conf-sim').onclick = () => { modal.remove(); cb(); };
    document.getElementById('conf-nao').onclick = () => modal.remove();
}

function abrirPainelAdmin() { document.getElementById('admin-panel').classList.remove('hidden'); }
function fecharPainelAdmin() { document.getElementById('admin-panel').classList.add('hidden'); }

function adicionarBotaoAdmin() {
    if(document.getElementById('adm-btn-fixo')) return;
    const b = document.createElement('button');
    b.id = "adm-btn-fixo"; b.className = "btn-primary"; b.textContent = "⚙️ Painel de Gestão";
    b.style.cssText = "position:fixed; bottom:20px; right:20px; width:auto; z-index:100; padding:10px 20px;";
    b.onclick = abrirPainelAdmin;
    document.body.appendChild(b);
}

// --- ATALHO ADMIN (CTRL+SHIFT+A) ---
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyA") {
        const modal = document.createElement('div');
        modal.className = 'banner-sobre';
        modal.innerHTML = `<div class="banner-content" style="text-align:center"><h2>Login Administrador</h2>
        <input type="password" id="pass-admin" class="input-edit" placeholder="Senha">
        <button class="btn-primary" id="go-admin">Entrar</button>
        <button class="btn-secondary" style="margin-top:10px" onclick="this.parentElement.parentElement.remove()">Cancelar</button></div>`;
        document.body.appendChild(modal);
        document.getElementById('go-admin').onclick = () => {
            if(document.getElementById('pass-admin').value === "admin2026") {
                isAdmin = true; modal.remove(); irParaMain("Gestão do Portal");
            } else { alert("Senha incorreta"); }
        };
    }
});