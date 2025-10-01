// Sistema de Controle de Estoque
class EstoqueManager {
    constructor() {
        this.produtos = this.carregarProdutos();
        this.produtoEditando = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderizarProdutos();
        this.atualizarEstatisticas();
    }

    bindEvents() {
        // Formulário
        document.getElementById('produto-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarProduto();
        });

        document.getElementById('btn-cancelar').addEventListener('click', () => {
            this.cancelarEdicao();
        });

        // Busca
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filtrarProdutos(e.target.value);
        });

        // Modal
        document.getElementById('btn-confirmar-exclusao').addEventListener('click', () => {
            this.confirmarExclusao();
        });

        document.getElementById('btn-cancelar-exclusao').addEventListener('click', () => {
            this.fecharModal();
        });

        document.getElementById('modal-overlay').addEventListener('click', () => {
            this.fecharModal();
        });

        // Tecla ESC para fechar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.fecharModal();
                this.cancelarEdicao();
            }
        });
    }

    // Gerenciamento de dados
    carregarProdutos() {
        const produtos = localStorage.getItem('estoque-produtos');
        return produtos ? JSON.parse(produtos) : [];
    }

    salvarProdutos() {
        localStorage.setItem('estoque-produtos', JSON.stringify(this.produtos));
    }

    // Operações CRUD
    salvarProduto() {
        const form = document.getElementById('produto-form');
        const formData = new FormData(form);
        
        const produto = {
            nome: formData.get('nome').trim(),
            quantidade: parseInt(formData.get('quantidade'))
        };

        // Validação
        if (!this.validarProduto(produto)) {
            return;
        }

        if (this.produtoEditando) {
            // Editar produto existente
            const index = this.produtos.findIndex(p => p.id === this.produtoEditando);
            if (index !== -1) {
                this.produtos[index] = { ...produto, id: this.produtoEditando };
                this.mostrarNotificacao('Produto atualizado com sucesso!', 'success');
            }
            this.cancelarEdicao();
        } else {
            // Adicionar novo produto
            produto.id = Date.now().toString();
            this.produtos.push(produto);
            this.mostrarNotificacao('Produto adicionado com sucesso!', 'success');
        }

        this.salvarProdutos();
        this.renderizarProdutos();
        this.atualizarEstatisticas();
        form.reset();
    }

    validarProduto(produto) {
        if (!produto.nome || produto.nome.length < 2) {
            this.mostrarNotificacao('Nome do produto deve ter pelo menos 2 caracteres', 'error');
            return false;
        }

        if (produto.quantidade < 0) {
            this.mostrarNotificacao('Quantidade não pode ser negativa', 'error');
            return false;
        }



        // Verificar se já existe produto com mesmo nome (exceto se estiver editando)
        const produtoExistente = this.produtos.find(p => 
            p.nome.toLowerCase() === produto.nome.toLowerCase() && 
            (!this.produtoEditando || p.id !== this.produtoEditando)
        );

        if (produtoExistente) {
            this.mostrarNotificacao('Já existe um produto com este nome', 'error');
            return false;
        }

        return true;
    }

    editarProduto(id) {
        const produto = this.produtos.find(p => p.id === id);
        if (!produto) return;

        this.produtoEditando = id;
        
        // Preencher formulário
        document.getElementById('nome').value = produto.nome;
        document.getElementById('quantidade').value = produto.quantidade;

        // Atualizar interface
        document.getElementById('btn-salvar').textContent = 'Atualizar Produto';
        document.getElementById('btn-cancelar').style.display = 'inline-block';
        
        // Scroll para o formulário
        document.querySelector('.form-section').scrollIntoView({ 
            behavior: 'smooth' 
        });

        // Focar no primeiro campo
        document.getElementById('nome').focus();
    }

    cancelarEdicao() {
        this.produtoEditando = null;
        document.getElementById('produto-form').reset();
        document.getElementById('btn-salvar').textContent = 'Adicionar Produto';
        document.getElementById('btn-cancelar').style.display = 'none';
    }

    excluirProduto(id) {
        this.produtoParaExcluir = id;
        this.abrirModal();
    }

    confirmarExclusao() {
        if (this.produtoParaExcluir) {
            this.produtos = this.produtos.filter(p => p.id !== this.produtoParaExcluir);
            this.salvarProdutos();
            this.renderizarProdutos();
            this.atualizarEstatisticas();
            this.mostrarNotificacao('Produto excluído com sucesso!', 'success');
            this.produtoParaExcluir = null;
        }
        this.fecharModal();
    }

    // Interface
    renderizarProdutos(produtosFiltrados = null) {
        const tbody = document.getElementById('produtos-tbody');
        const emptyState = document.getElementById('empty-state');
        const produtos = produtosFiltrados || this.produtos;

        if (produtos.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        tbody.innerHTML = produtos.map(produto => {
            const status = this.getStatusProduto(produto.quantidade);
            
            return `
                <tr class="fade-in">
                    <td><strong>${this.escapeHtml(produto.nome)}</strong></td>
                    <td>${produto.quantidade}</td>
                    <td><span class="status-badge ${status.class}">${status.text}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-edit" onclick="estoque.editarProduto('${produto.id}')">
                                Editar
                            </button>
                            <button class="btn-delete" onclick="estoque.excluirProduto('${produto.id}')">
                                Excluir
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStatusProduto(quantidade) {
        if (quantidade === 0) {
            return { class: 'status-esgotado', text: 'Esgotado' };
        } else if (quantidade <= 5) {
            return { class: 'status-baixo', text: 'Baixo' };
        } else {
            return { class: 'status-normal', text: 'Normal' };
        }
    }

    filtrarProdutos(termo) {
        if (!termo.trim()) {
            this.renderizarProdutos();
            return;
        }

        const produtosFiltrados = this.produtos.filter(produto =>
            produto.nome.toLowerCase().includes(termo.toLowerCase())
        );

        this.renderizarProdutos(produtosFiltrados);
    }

    atualizarEstatisticas() {
        const totalProdutos = this.produtos.length;
        const produtosBaixa = this.produtos.filter(produto => 
            produto.quantidade <= 5 && produto.quantidade > 0
        ).length;

        document.getElementById('total-produtos').textContent = totalProdutos;
        document.getElementById('produtos-baixa').textContent = produtosBaixa;
    }

    // Modal
    abrirModal() {
        document.getElementById('modal-confirmacao').style.display = 'block';
        document.getElementById('modal-overlay').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    fecharModal() {
        document.getElementById('modal-confirmacao').style.display = 'none';
        document.getElementById('modal-overlay').style.display = 'none';
        document.body.style.overflow = 'auto';
        this.produtoParaExcluir = null;
    }

    // Utilitários
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    mostrarNotificacao(mensagem, tipo = 'info') {
        // Remover notificação existente
        const notificacaoExistente = document.querySelector('.notificacao');
        if (notificacaoExistente) {
            notificacaoExistente.remove();
        }

        // Criar nova notificação
        const notificacao = document.createElement('div');
        notificacao.className = `notificacao notificacao-${tipo}`;
        notificacao.textContent = mensagem;
        
        // Estilos da notificação
        Object.assign(notificacao.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            zIndex: '9999',
            maxWidth: '400px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
            animation: 'slideInRight 0.3s ease',
            cursor: 'pointer'
        });

        // Cores por tipo
        const cores = {
            success: 'linear-gradient(135deg, #48bb78, #38a169)',
            error: 'linear-gradient(135deg, #f56565, #e53e3e)',
            info: 'linear-gradient(135deg, #4299e1, #3182ce)'
        };

        notificacao.style.background = cores[tipo] || cores.info;

        // Adicionar ao DOM
        document.body.appendChild(notificacao);

        // Remover automaticamente após 4 segundos
        setTimeout(() => {
            if (notificacao.parentNode) {
                notificacao.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notificacao.parentNode) {
                        notificacao.remove();
                    }
                }, 300);
            }
        }, 4000);

        // Remover ao clicar
        notificacao.addEventListener('click', () => {
            notificacao.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notificacao.parentNode) {
                    notificacao.remove();
                }
            }, 300);
        });
    }

    // Métodos para demonstração
    adicionarDadosDemo() {
        const produtosDemo = [
            { nome: 'Notebook Dell', quantidade: 15 },
            { nome: 'Mouse Logitech', quantidade: 3 },
            { nome: 'Teclado Mecânico', quantidade: 0 },
            { nome: 'Monitor 24"', quantidade: 8 },
            { nome: 'Webcam HD', quantidade: 12 }
        ];

        produtosDemo.forEach(produto => {
            produto.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            this.produtos.push(produto);
        });

        this.salvarProdutos();
        this.renderizarProdutos();
        this.atualizarEstatisticas();
        this.mostrarNotificacao('Dados de demonstração adicionados!', 'success');
    }

    limparTodosDados() {
        if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
            this.produtos = [];
            this.salvarProdutos();
            this.renderizarProdutos();
            this.atualizarEstatisticas();
            this.cancelarEdicao();
            this.mostrarNotificacao('Todos os dados foram removidos!', 'info');
        }
    }

    exportarDados() {
        const dados = {
            produtos: this.produtos,
            exportadoEm: new Date().toISOString(),
            versao: '1.0'
        };

        const blob = new Blob([JSON.stringify(dados, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `estoque-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.mostrarNotificacao('Dados exportados com sucesso!', 'success');
    }
}

// Adicionar animações CSS via JavaScript
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Inicializar aplicação
let estoque;

document.addEventListener('DOMContentLoaded', () => {
    estoque = new EstoqueManager();
    
    // Adicionar atalhos de teclado
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N para novo produto
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            document.getElementById('nome').focus();
        }
        
        // Ctrl/Cmd + F para buscar
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('search-input').focus();
        }
    });

    // Adicionar botões de demonstração (apenas para desenvolvimento)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const demoButtons = document.createElement('div');
        demoButtons.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        `;
        
        demoButtons.innerHTML = `
            <button onclick="estoque.adicionarDadosDemo()" style="
                padding: 8px 12px;
                background: #4299e1;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
            ">Demo</button>
            <button onclick="estoque.limparTodosDados()" style="
                padding: 8px 12px;
                background: #f56565;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
            ">Limpar</button>
            <button onclick="estoque.exportarDados()" style="
                padding: 8px 12px;
                background: #48bb78;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
            ">Exportar</button>
        `;
        
        document.body.appendChild(demoButtons);
    }
});

// Prevenir perda de dados ao sair da página
window.addEventListener('beforeunload', (e) => {
    if (estoque && estoque.produtoEditando) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
    }
});
