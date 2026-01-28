// --- CONFIGURAÇÃO SUPABASE ---
// Substitua pelos seus dados do Dashboard > Settings > API
const SUPABASE_URL = "https://eaaaklpqdoycsvnyxcbd.supabase.co";
const SUPABASE_KEY = "sb_publishable_BaXK8PAMPG-FmZf-itpGDg_8EKQu0ZZ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let alunoAtual = { nome: "", serie: "", eletivaInscrita: "" };
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-salvar-eletiva').onclick = salvarEletiva;
    document.getElementById('fechar-admin').onclick = fecharPainelAdmin;
    document.getElementById('fechar-sobre').onclick = () => document.getElementById('sobre-banner').classList.add('hidden');
    document.getElementById('serieAluno').addEventListener('change', carregarNomesAlunos);
    document.getElementById('entrar-btn').onclick = logar;

    // Impede digitação de letras no campo de quantidade de vagas
    const vagasInput = document.getElementById('adm-vagas');
    if (vagasInput) {
        vagasInput.addEventListener('keydown', function(e) {
            // Permite: backspace, delete, tab, escape, enter, setas, home, end
            if (["Backspace","Delete","Tab","Escape","Enter","ArrowLeft","ArrowRight","Home","End"].includes(e.key)) return;
            // Permite: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            if ((e.ctrlKey || e.metaKey) && ["a","c","v","x"].includes(e.key.toLowerCase())) return;
            // Permite apenas números
            if (!/^[0-9]$/.test(e.key)) e.preventDefault();
        });
        // Impede colar texto não numérico
        vagasInput.addEventListener('paste', function(e) {
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            if (!/^\d+$/.test(paste)) e.preventDefault();
        });
    }
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
        const { data: alunos, error } = await supabaseClient
            .from('alunos_base')
            .select('*')
            .eq('serie', serie)
            .order('nome', { ascending: true });

        if (error) throw error;

        nomeSelect.innerHTML = '<option value="">Selecione seu nome</option>';
        alunos.forEach(a => {
            let opt = document.createElement('option');
            opt.value = a.nome;
            opt.dataset.eletiva = a.eletiva_inscrita || "";
            opt.textContent = a.nome;
            nomeSelect.appendChild(opt);
        });
        nomeSelect.disabled = false;
    } catch (err) {
        console.error("Erro ao carregar alunos do banco:", err);
        exibirMensagem("Erro", "Erro ao carregar alunos do banco.", "erro");
    } finally {
        esconderCarregando();
    }
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
    atualizarStatusAluno();
    if (isAdmin) {
        adicionarBotaoAdmin();
        const btnTodos = document.getElementById('btn-imprimir-todos');
        if (btnTodos) btnTodos.classList.remove('hidden');
    } else {
        const btnTodos = document.getElementById('btn-imprimir-todos');
        if (btnTodos) btnTodos.classList.add('hidden');
    }
    carregarEletivas();
}
// Impressão de todos os alunos por turma (admin)
document.addEventListener('DOMContentLoaded', () => {
    const btnTodos = document.getElementById('btn-imprimir-todos');
    if (btnTodos) {
        btnTodos.onclick = async function() {
            mostrarCarregando('Buscando alunos...');
            try {
                const { data: alunos, error } = await supabaseClient
                    .from('alunos_base')
                    .select('nome, serie, eletiva_inscrita')
                    .order('serie', { ascending: true });
                if (error || !alunos) throw error || 'Erro ao buscar alunos';
                // Agrupa por turma
                const turmas = {};
                alunos.forEach(a => {
                    if (!turmas[a.serie]) turmas[a.serie] = [];
                    turmas[a.serie].push(a);
                });
                // Ordena turmas e alunos
                const turmasOrdenadas = Object.keys(turmas).sort((a,b) => a.localeCompare(b, 'pt-BR'));
                turmasOrdenadas.forEach(turma => {
                    turmas[turma].sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
                });
                // Monta HTML para impressão
                const win = window.open('', '', 'width=900,height=1200');
                win.document.write('<html><head><title>Lista de Todos os Alunos</title>');
                win.document.write('<style>body{font-family:sans-serif;padding:30px;}h2{margin-bottom:10px;}h3{margin-top:30px;}ul{font-size:17px;}li{margin-bottom:4px;} .sem-eletiva{color:#c00;}</style>');
                win.document.write('</head><body>');
                win.document.write('<h2>Lista de Todos os Alunos por Turma</h2>');
                turmasOrdenadas.forEach(turma => {
                    win.document.write(`<h3>${turma}</h3><ul>`);
                    turmas[turma].forEach(a => {
                        const eletiva = a.eletiva_inscrita ? a.eletiva_inscrita : '<span class="sem-eletiva">(Sem Eletiva)</span>';
                        win.document.write(`<li>${a.nome} - ${eletiva}</li>`);
                    });
                    win.document.write('</ul>');
                });
                win.document.write('</body></html>');
                win.document.close();
                win.print();
            } catch (err) {
                alert('Erro ao buscar alunos para impressão.');
            } finally {
                esconderCarregando();
            }
        };
    }
});

function atualizarStatusAluno() {
    const status = document.getElementById('status-aluno');
    status.textContent = isAdmin ? "Modo Administrador" : (alunoAtual.eletivaInscrita ? `Sua eletiva: ${alunoAtual.eletivaInscrita}` : "Escolha sua eletiva.");
    status.style.background = isAdmin ? "#e3f2fd" : (alunoAtual.eletivaInscrita ? "#c8e6c9" : "#ffecb3");
}

// --- ELETIVAS E INSCRIÇÃO ---
async function carregarEletivas() {
    mostrarCarregando("Carregando eletivas...");
    try {
        const { data: eletivas, error } = await supabaseClient
            .from('lista_eletivas_com_vagas')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;

        const list = document.getElementById('eletivas-list');
        list.innerHTML = "";
        eletivas.forEach(el => {
            const card = document.createElement('div');
            card.className = "eletiva-card";
            // Sempre mostra apenas emoji (ou padrão)
            const visual = `<div class="emoji-eletiva">${el.foto || '📘'}</div>`;
            card.innerHTML = `${visual}<strong>${el.nome}</strong><div>${el.vagas_restantes} vagas</div>`;
            card.onclick = () => abrirDetalhes(el);
            if (isAdmin) {
                const btns = document.createElement('div');
                btns.style.marginTop = '10px';
                btns.innerHTML = `
                    <button class="btn-secondary" onclick="event.stopPropagation(); editarEletiva(${JSON.stringify(el).replace(/"/g, '&quot;')})">✏️ Editar</button>
                    <button class="btn-secondary" style="background:#ffcdd2" onclick="event.stopPropagation(); removerEletiva('${el.nome}')">🗑️ Deletar</button>`;
                card.appendChild(btns);
            }
            list.appendChild(card);
        });
    } finally { esconderCarregando(); }
}


async function abrirDetalhes(el) {
    document.getElementById('sobre-nome').textContent = el.nome;
    document.getElementById('sobre-descricao').textContent = el.descricao;
    document.getElementById('sobre-prof').textContent = `Professor: ${el.professor}`;
    document.getElementById('sobre-vagas').textContent = `Vagas: ${el.vagas_restantes}/${el.vagas_totais}`;

    const btn = document.getElementById('btn-inscrever-confirmar');
    const adminViewLista = document.getElementById('admin-view-lista');
    const listaAlunos = document.getElementById('lista-alunos-inscritos');
    const btnImprimir = document.getElementById('btn-imprimir-lista');

    if (!isAdmin) {
        btn.classList.remove('hidden');
        btn.disabled = (alunoAtual.eletivaInscrita === el.nome || el.vagas_restantes <= 0);
        btn.textContent = el.vagas_restantes <= 0 ? "Vagas Esgotadas" : "Confirmar Inscrição ✓";
        btn.onclick = () => {
            if (alunoAtual.eletivaInscrita && alunoAtual.eletivaInscrita !== el.nome) {
                exibirConfirmacao("Trocar Eletiva", `Você já está em "${alunoAtual.eletivaInscrita}". Deseja trocar para "${el.nome}"?`, () => registrar(el.nome));
            } else { registrar(el.nome); }
        };
        adminViewLista.classList.add('hidden');
    } else {
        btn.classList.add('hidden');
        adminViewLista.classList.remove('hidden');
        // Buscar alunos inscritos na eletiva
        mostrarCarregando("Buscando inscritos...");
        try {
            const { data: alunos, error } = await supabaseClient
                .from('alunos_base')
                .select('nome, serie')
                .eq('eletiva_inscrita', el.nome);
            listaAlunos.innerHTML = '';
            if (error || !alunos || alunos.length === 0) {
                listaAlunos.innerHTML = '<li>Nenhum aluno inscrito.</li>';
            } else {
                // Ordena alfabeticamente por nome
                alunos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
                alunos.forEach(a => {
                    const li = document.createElement('li');
                    li.textContent = `${a.nome} (${a.serie})`;
                    listaAlunos.appendChild(li);
                });
            }
        } catch (err) {
            listaAlunos.innerHTML = '<li>Erro ao buscar inscritos.</li>';
        } finally {
            esconderCarregando();
        }
        // Botão imprimir
        if (btnImprimir) {
            btnImprimir.onclick = function() {
                const win = window.open('', '', 'width=700,height=900');
                win.document.write('<html><head><title>Lista de Inscritos</title>');
                win.document.write('<style>body{font-family:sans-serif;padding:30px;}h2{margin-bottom:10px;}ul{font-size:18px;}li{margin-bottom:5px;}</style>');
                win.document.write('</head><body>');
                win.document.write(`<h2>Inscritos na Eletiva: ${el.nome}</h2>`);
                win.document.write(`<div style="margin-bottom:15px;font-size:1.1em;"><strong>Professor:</strong> ${el.professor}</div>`);
                win.document.write('<ul>');
                listaAlunos.querySelectorAll('li').forEach(li => {
                    win.document.write(`<li>${li.textContent}</li>`);
                });
                win.document.write('</ul>');
                win.document.write('</body></html>');
                win.document.close();
                win.print();
            };
        }
    }
    document.getElementById('sobre-banner').classList.remove('hidden');
}

async function registrar(nova) {
    mostrarCarregando("Gravando inscrição...");
    try {
        // ATUALIZAÇÃO: Grava a eletiva e a data/hora exata do clique
        const { error } = await supabaseClient
            .from('alunos_base')
            .update({ 
                eletiva_inscrita: nova,
                created_at: new Date().toISOString() // Data do momento da escolha
            })
            .eq('nome', alunoAtual.nome)
            .eq('serie', alunoAtual.serie);

        if (error) throw error;

        exibirMensagem("Sucesso!", "Inscrição realizada com sucesso!", "sucesso", () => window.location.reload());
    } catch (err) { 
        exibirMensagem("Erro", "Falha na inscrição.", "erro"); 
    } finally { 
        esconderCarregando(); 
    }
}

// --- ADMINISTRAÇÃO ---
async function salvarEletiva() {
    const nome = document.getElementById('adm-nome').value.trim();
    const desc = document.getElementById('adm-desc').value.trim();
    const prof = document.getElementById('adm-prof').value.trim();
    const vagas = parseInt(document.getElementById('adm-vagas').value);
        const emojiInput = document.getElementById('adm-emoji');
        let emoji = emojiInput.value.trim();

    if (!nome || !desc || !prof || !vagas) return exibirMensagem("Atenção", "Preencha todos os campos!", "erro");

    mostrarCarregando("Salvando...");
    const editing = document.getElementById('btn-salvar-eletiva').dataset.editing;

    try {

        if (editing) {
                await supabaseClient.from('config_eletivas').update({ nome, descricao: desc, professor: prof, vagas_totais: vagas, foto: emoji }).eq('nome', editing);
        } else {
                await supabaseClient.from('config_eletivas').insert([{ nome, descricao: desc, professor: prof, vagas_totais: vagas, foto: emoji }]);
        }
        exibirMensagem("Sucesso!", "Dados salvos!", "sucesso", () => {
            fecharPainelAdmin();
            carregarEletivas();
        });
    } catch (e) { 
        exibirMensagem("Erro", "Falha ao salvar.", "erro"); 
    } finally { 
        esconderCarregando(); 
    }
}

function editarEletiva(el) {
    document.getElementById('adm-nome').value = el.nome;
    document.getElementById('adm-desc').value = el.descricao;
    document.getElementById('adm-prof').value = el.professor;
    document.getElementById('adm-vagas').value = el.vagas_totais;
        document.getElementById('adm-emoji').value = el.foto || "";
    document.getElementById('btn-salvar-eletiva').dataset.editing = el.nome;
    abrirPainelAdmin();
}

async function removerEletiva(nome) {
    exibirConfirmacao("Deletar", `Deseja deletar "${nome}"?`, async () => {
        mostrarCarregando("Deletando...");
        await supabaseClient.from('config_eletivas').delete().eq('nome', nome);
        carregarEletivas();
        esconderCarregando();
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
    modal.innerHTML = `
        <div class="banner-content" style="text-align:center">
            <h3>${tit}</h3><p>${tex}</p>
            <button class="btn-primary" id="conf-sim">Confirmar</button>
            <button class="btn-secondary" id="conf-nao" style="margin-top:10px">Cancelar</button>
        </div>`;
    document.body.appendChild(modal);
    document.getElementById('conf-sim').onclick = () => { modal.remove(); cb(); };
    document.getElementById('conf-nao').onclick = () => modal.remove();
}

function abrirPainelAdmin() { document.getElementById('admin-panel').classList.remove('hidden'); }
function fecharPainelAdmin() { 
    document.getElementById('admin-panel').classList.add('hidden'); 
    document.getElementById('btn-salvar-eletiva').dataset.editing = "";
}

function adicionarBotaoAdmin() {
    if(document.getElementById('adm-btn-fixo')) return;
    const b = document.createElement('button');
    b.id = "adm-btn-fixo";
    b.className = "btn-primary";
    b.textContent = "➕ Add";
    b.style.cssText = "position:fixed; bottom:20px; right:20px; width:auto; z-index:100; padding:10px 20px; font-size:17px;";
    b.onclick = abrirPainelAdmin;
    document.body.appendChild(b);
}

// ATALHO ADMIN (CTRL+SHIFT+A)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyA") {
        // Cria modal estilizado para senha admin
        if (document.getElementById('modal-admin-senha')) return;
        const modal = document.createElement('div');
        modal.className = 'banner-sobre';
        modal.id = 'modal-admin-senha';
        modal.innerHTML = `
            <div class="banner-content" style="text-align:center; max-width:350px;">
                <h3>Senha de Administrador</h3>
                <input type="password" id="input-admin-senha" class="input-edit" placeholder="Digite a senha" style="margin-bottom:15px;">
                <div style="display:flex; gap:10px; flex-direction:column;">
                    <button class="btn-primary" id="btn-admin-ok">Entrar</button>
                    <button class="btn-secondary" id="btn-admin-cancelar">Cancelar</button>
                </div>
                <div id="admin-senha-erro" style="color:#c00; margin-top:10px; display:none;">Senha incorreta!</div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('input-admin-senha').focus();
        document.getElementById('btn-admin-ok').onclick = () => {
            const pass = document.getElementById('input-admin-senha').value;
            if(pass === "admin@2026jrm") {
                isAdmin = true;
                modal.remove();
                irParaMain("Gestão do Portal");
            } else {
                document.getElementById('admin-senha-erro').style.display = '';
            }
        };
        document.getElementById('btn-admin-cancelar').onclick = () => modal.remove();
        document.getElementById('input-admin-senha').addEventListener('keydown', function(ev) {
            if (ev.key === 'Enter') document.getElementById('btn-admin-ok').click();
        });
    }
});