import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** 
 * =========================================================================
 * 🔑 CONFIGURAÇÕES GERAIS
 * =========================================================================
 */
const SUPABASE_URL = 'https://nqsqepsyaaplcvwvibxp.supabase.co/'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xc3FlcHN5YWFwbGN2d3ZpYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzM3MzMsImV4cCI6MjA5NDMwOTczM30.ql5FCeA24koqaGNT9d7ke_NuxOoAIBgD9uUJTp1jVkA';

const ADMIN_EMAILS = [
  'arthurgmgalvao@gmail.com',
  'noaheana@gmail.com'
];

class SupabaseConnection {
  private sessionToken: string | null = null;
  public userId: string | null = null;
  
  setSession(token: string, userId: string) {
    this.sessionToken = token;
    this.userId = userId;
  }
  
  private getHeaders(useAuth = false) {
    const headers: any = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    if (useAuth && this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    } else {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
    return headers;
  }
  
  async login(email: string, password: string): Promise<{error?: string, token?: string, userId?: string}> {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) return { error: data.error_description || data.msg || 'Erro de credenciais' };
      this.setSession(data.access_token, data.user.id);
      return { token: data.access_token, userId: data.user.id };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  async register(email: string, password: string): Promise<{error?: string, success?: boolean}> {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) return { error: data.error_description || data.msg || 'Erro ao registrar' };
      if (data.session) this.setSession(data.session.access_token, data.user.id);
      return { success: true };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  async getTickets(isAdmin: boolean): Promise<Ticket[]> {
    try {
      let url = `${SUPABASE_URL}/rest/v1/tickets?order=created_at.desc`;
      if (!isAdmin && this.userId) url += `&user_id=eq.${this.userId}`;
      const response = await fetch(url, { method: 'GET', headers: this.getHeaders(true) });
      if (!response.ok) throw new Error('Erro na conexão');
      return await response.json();
    } catch (error) {
      console.error(error);
      return []; 
    }
  }

  async insertTicket(ticket: Partial<Ticket>): Promise<any> {
    try {
      if (!ticket.user_id && this.userId) ticket.user_id = this.userId;
      await fetch(`${SUPABASE_URL}/rest/v1/tickets`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(ticket)
      });
    } catch (error) {
      console.error('Erro ao inserir', error);
    }
  }

  async updateTicket(id: number, status: string): Promise<any> {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${id}`, {
        method: 'PATCH',
        headers: this.getHeaders(true),
        body: JSON.stringify({ status })
      });
    } catch (error) {
      console.error('Erro ao atualizar', error);
    }
  }
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
  user_id?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="app-container">
  @if (!isAuthenticated) {
    <div class="auth-container">
      <div class="auth-box">
        <div class="auth-logo">
          <div class="logo-icon"><i class="fa-solid fa-fire-flame-curved"></i></div>
          <h1>FlameDesk</h1>
          <p>O melhor sistema premium de suporte.</p>
        </div>
        <div class="auth-form">
          <h2>{{ isRegistering ? 'Criar sua Conta' : 'Acesse sua Conta' }}</h2>
          @if (authError) { <div class="alert error"><i class="fa-solid fa-circle-exclamation"></i> {{ authError }} </div> }
          <div class="form-group">
            <label>E-mail</label>
            <input type="email" [(ngModel)]="authEmail" placeholder="seu@email.com">
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input type="password" [(ngModel)]="authPassword" placeholder="••••••••">
          </div>
          <button class="btn-primary w-100 mt-20" (click)="isRegistering ? doRegister() : doLogin()" [disabled]="isAuthLoading">
            @if (isAuthLoading) { <i class="fa-solid fa-spinner fa-spin"></i> Processando... } @else { {{ isRegistering ? 'Cadastrar e Entrar' : 'Entrar no Sistema' }} }
          </button>
          <div class="auth-switch">
            @if (isRegistering) { <p>Já possui uma conta? <a href="javascript:void(0)" (click)="isRegistering = false">Fazer Login</a></p> }
            @else { <p>Novo por aqui? <a href="javascript:void(0)" (click)="isRegistering = true">Crie uma conta grátis</a></p> }
          </div>
        </div>
      </div>
    </div>
  } @else if (isAdmin) {
    <aside class="sidebar">
      <div class="logo-area">
        <div class="logo-icon"><i class="fa-solid fa-fire-flame-curved"></i></div>
        <h1 class="logo-text">FlameDesk</h1>
        <span class="role-badge">Admin</span>
      </div>
      <nav class="nav-menu">
        <a href="javascript:void(0)" class="nav-item" [class.active]="currentView === 'dashboard'" (click)="changeView('dashboard')"><i class="fa-solid fa-chart-pie"></i><span>Dashboard Geral</span></a>
        <a href="javascript:void(0)" class="nav-item" [class.active]="currentView === 'my_tickets'" (click)="changeView('my_tickets')"><i class="fa-solid fa-ticket"></i><span>Chamados em Aberto</span></a>
        <a href="javascript:void(0)" class="nav-item"><i class="fa-solid fa-users"></i><span>Equipe Técnica</span></a>
        <a href="javascript:void(0)" class="nav-item"><i class="fa-solid fa-gear"></i><span>Ajustes</span></a>
      </nav>
      <div class="user-profile">
        <div class="avatar"><img src="https://ui-avatars.com/api/?name=Admin&background=ff5e00&color=fff" alt="Avatar"></div>
        <div class="user-info"><span class="user-name">{{ authEmail.split('@')[0] }}</span><a href="javascript:void(0)" class="logout-btn" (click)="logout()">Sair</a></div>
      </div>
    </aside>
    <main class="main-content">
      <header class="topbar"><div class="search-bar"><i class="fa-solid fa-magnifying-glass"></i><input type="text" placeholder="Buscar chamados..."></div></header>
      <div class="content-body">
        @if (currentView === 'dashboard' || currentView === 'my_tickets') {
          @if (currentView === 'dashboard') {
            <section class="stats-grid">
              <div class="stat-card"><div class="stat-icon open"><i class="fa-solid fa-folder-open"></i></div><div class="stat-details"><h3>{{ openTickets }}</h3><p>Em Aberto</p></div></div>
              <div class="stat-card"><div class="stat-icon total"><i class="fa-solid fa-layer-group"></i></div><div class="stat-details"><h3>{{ totalTickets }}</h3><p>Total</p></div></div>
              <div class="stat-card"><div class="stat-icon resolved"><i class="fa-solid fa-circle-check"></i></div><div class="stat-details"><h3>{{ resolvedTickets }}</h3><p>Resolvidos</p></div></div>
            </section>
          }
          <section class="tickets-section">
            <div class="section-header"><h2>{{ currentView === 'dashboard' ? 'Fila Geral' : 'Chamados Não Resolvidos' }}</h2></div>
            <div class="tickets-list">
              @if (isLoading) { <div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Sincronizando...</p></div> }
              @else {
                @if (filteredTickets.length === 0) { <div class="empty-state"><i class="fa-solid fa-box-open"></i><p>Nenhum chamado pendente.</p></div> }
                @for (ticket of filteredTickets; track ticket.id) {
                  <div class="ticket-card" [class.resolved]="ticket.status === 'RESOLVED'">
                    <div class="ticket-status-bar" [ngClass]="ticket.status.toLowerCase()"></div>
                    <div class="ticket-content">
                      <div class="ticket-header"><span class="ticket-id">#{{ ticket.id | number:'3.0-0' }}</span><h3 class="ticket-title">{{ ticket.title }}</h3></div>
                      <p class="ticket-desc">{{ ticket.description }}</p>
                      <div class="ticket-meta">
                        <div class="meta-item"><i class="fa-regular fa-clock"></i><span>{{ ticket.created_at | date:'dd/MM HH:mm' }}</span></div>
                        <div class="badges"><span class="badge-priority" [ngClass]="ticket.priority.toLowerCase()">{{ getPriorityLabel(ticket.priority) }}</span><span class="badge-status" [ngClass]="ticket.status.toLowerCase()">{{ getStatusLabel(ticket.status) }}</span></div>
                      </div>
                    </div>
                    <div class="ticket-actions">
                      @if (ticket.status === 'OPEN') { <button class="action-btn process" (click)="updateStatus(ticket, 'IN_PROGRESS')"><i class="fa-solid fa-play"></i></button> }
                      @if (ticket.status !== 'RESOLVED') { <button class="action-btn resolve" (click)="updateStatus(ticket, 'RESOLVED')"><i class="fa-solid fa-check"></i></button> }
                      @if (ticket.status === 'RESOLVED') { <button class="action-btn reopen" (click)="updateStatus(ticket, 'OPEN')"><i class="fa-solid fa-rotate-left"></i></button> }
                    </div>
                  </div>
                }
              }
            </div>
          </section>
        }
      </div>
    </main>
  } @else {
    <div class="user-portal-wrapper">
      <header class="portal-header">
        <div class="portal-nav">
          <div class="logo-area-simple">
            <div class="logo-icon-simple"><i class="fa-solid fa-fire-flame-curved"></i></div>
            <h1 class="logo-text">FlameDesk</h1>
          </div>
          <div class="portal-user-actions">
            <div class="user-profile-simple">
              <img src="https://ui-avatars.com/api/?name={{authEmail.split('@')[0]}}&background=ff5e00&color=fff" alt="Avatar">
              <span class="welcome-text">Olá, {{ authEmail.split('@')[0] }}</span>
            </div>
            <button class="btn-logout-simple" (click)="logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sair</button>
          </div>
        </div>
      </header>

      <div class="portal-hero">
        <div class="hero-content">
          <h1>Central de Ajuda</h1>
          <p>Como podemos ajudar você hoje? Acompanhe seus chamados ou abra uma nova solicitação.</p>
          <button class="btn-hero-primary" (click)="openForm()">
            <i class="fa-solid fa-comment-dots"></i> Nova Solicitação
          </button>
        </div>
      </div>

      <main class="portal-body">
        <section class="portal-stats-grid">
          <div class="stat-card">
            <div class="stat-icon open"><i class="fa-solid fa-folder-open"></i></div>
            <div class="stat-details"><h3>{{ openTickets }}</h3><p>Em Aberto</p></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon total"><i class="fa-solid fa-layer-group"></i></div>
            <div class="stat-details"><h3>{{ totalTickets }}</h3><p>Total de Chamados</p></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon resolved"><i class="fa-solid fa-circle-check"></i></div>
            <div class="stat-details"><h3>{{ resolvedTickets }}</h3><p>Resolvidos</p></div>
          </div>
        </section>

        <section class="portal-tickets-section">
          <div class="section-header-portal">
            <h2>Seus Chamados Recentes</h2>
            <div class="search-bar-portal">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" placeholder="Buscar chamados..." [(ngModel)]="userSearchQuery">
            </div>
          </div>

          <div class="tickets-list portal-list">
            @if (isLoading) { 
              <div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Carregando seus chamados...</p></div> 
            } @else { 
              @if (filteredUserTickets.length === 0) { 
                <div class="empty-state-portal">
                  <div class="empty-icon"><i class="fa-regular fa-face-smile-wink"></i></div>
                  <h3>Nenhum chamado encontrado</h3>
                  <p>Você não possui chamados com essa busca ou ainda não abriu nenhum.</p>
                  <button class="btn-secondary mt-20" (click)="openForm()">Abrir um chamado agora</button>
                </div> 
              } 
              @for (ticket of filteredUserTickets; track ticket.id) { 
                <div class="ticket-card simple-card" [class.resolved]="ticket.status === 'RESOLVED'">
                  <div class="ticket-status-bar" [ngClass]="ticket.status.toLowerCase()"></div>
                  <div class="ticket-content">
                    <div class="ticket-header">
                      <span class="ticket-id">#{{ ticket.id | number:'3.0-0' }}</span>
                      <h3 class="ticket-title">{{ ticket.title }}</h3>
                    </div>
                    <p class="ticket-desc">{{ ticket.description }}</p>
                    <div class="ticket-meta">
                      <div class="meta-item"><i class="fa-regular fa-clock"></i><span>{{ ticket.created_at | date:'dd/MM HH:mm' }}</span></div>
                      <div class="badges">
                        <span class="badge-priority" [ngClass]="ticket.priority.toLowerCase()">{{ getPriorityLabel(ticket.priority) }}</span>
                        <span class="badge-status" [ngClass]="ticket.status.toLowerCase()">{{ getStatusLabel(ticket.status) }}</span>
                      </div>
                    </div>
                  </div>
                </div> 
              } 
            } 
          </div>
        </section>
      </main>
    </div>
  }
  @if (showNewTicketForm) {
    <div class="modal-overlay" (click)="closeForm()"><div class="modal-content" (click)="$event.stopPropagation()"><div class="modal-header"><h2>{{ isAdmin ? 'Novo Ticket' : 'Abrir Solicitação' }}</h2><button class="close-btn" (click)="closeForm()"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body"><div class="form-group"><label>Assunto</label><input type="text" [(ngModel)]="newTicketTitle"></div><div class="form-group"><label>Urgência</label><div class="priority-selector"><label class="priority-option low" [class.selected]="newTicketPriority === 'LOW'"><input type="radio" name="p" [value]="'LOW'" [(ngModel)]="newTicketPriority">Baixa</label><label class="priority-option medium" [class.selected]="newTicketPriority === 'MEDIUM'"><input type="radio" name="p" [value]="'MEDIUM'" [(ngModel)]="newTicketPriority">Média</label><label class="priority-option high" [class.selected]="newTicketPriority === 'HIGH'"><input type="radio" name="p" [value]="'HIGH'" [(ngModel)]="newTicketPriority">Alta</label></div></div><div class="form-group"><label>Detalhes</label><textarea [(ngModel)]="newTicketDesc" rows="4"></textarea></div></div><div class="modal-footer"><button class="btn-secondary" (click)="closeForm()">Cancelar</button><button class="btn-primary" (click)="createTicket()" [disabled]="!newTicketTitle || !newTicketDesc">Enviar</button></div></div></div>
  }
</div>`,
  styles: [`
:host { display: block; --primary-color: #ff5e00; --primary-glow: rgba(255, 94, 0, 0.4); --bg-panel: #1a110d; --border-color: #3d2317; --text-muted: #b8988a; --status-open: #ff9900; --status-progress: #3b82f6; --status-resolved: #22c55e; }
.app-container { display: flex; height: 100vh; width: 100%; overflow: hidden; background: #0c0806; color: white; }
.auth-container { display: flex; width: 100%; height: 100vh; align-items: center; justify-content: center; background-image: radial-gradient(circle at 50% 0%, rgba(200, 60, 10, 0.15) 0%, #0c0806 100%); }
.auth-box { background: rgba(20, 12, 9, 0.8); backdrop-filter: blur(16px); border: 1px solid var(--border-color); border-radius: 24px; padding: 40px; width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 30px; box-shadow: 0 0 40px var(--primary-glow); }
.auth-logo { text-align: center; } .logo-icon { width: 56px; height: 56px; background: linear-gradient(135deg, #ff8a00, #ff1100); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 10px; }
.auth-form h2 { margin-bottom: 20px; text-align: center; } .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; } .form-group label { color: var(--text-muted); font-size: 0.9rem; }
.form-group input, .form-group textarea { background: #110b08; border: 1px solid var(--border-color); padding: 12px; border-radius: 10px; color: white; }
.btn-primary { background: linear-gradient(135deg, var(--primary-color), #ff2a00); color: white; border: none; padding: 12px; border-radius: 100px; font-weight: 600; cursor: pointer; }
.auth-switch { text-align: center; margin-top: 20px; color: var(--text-muted); } .auth-switch a { color: var(--primary-color); text-decoration: none; font-weight: 600; }
.sidebar { width: 260px; background: rgba(18, 11, 8, 0.9); border-right: 1px solid var(--border-color); padding: 20px; display: flex; flex-direction: column; }
.logo-area { display: flex; align-items: center; gap: 10px; margin-bottom: 40px; } .logo-text { font-size: 1.4rem; font-weight: 800; }
.nav-menu { display: flex; flex-direction: column; gap: 10px; flex: 1; } .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px; color: var(--text-muted); text-decoration: none; border-radius: 10px; }
.nav-item.active { background: rgba(255, 94, 0, 0.1); color: var(--primary-color); border-left: 3px solid var(--primary-color); }
.main-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; } .topbar { padding: 20px; border-bottom: 1px solid var(--border-color); }
.content-body { padding: 30px; } .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
.stat-card { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 15px; }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.stat-icon.open { background: rgba(255, 153, 0, 0.1); color: var(--status-open); } .stat-icon.resolved { background: rgba(34, 197, 94, 0.1); color: var(--status-resolved); }
.tickets-section { background: rgba(26, 17, 13, 0.4); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px; }
.ticket-card { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 12px; display: flex; margin-bottom: 15px; overflow: hidden; }
.ticket-status-bar { width: 5px; } .ticket-status-bar.open { background: var(--status-open); } .ticket-status-bar.resolved { background: var(--status-resolved); }
.ticket-content { padding: 15px; flex: 1; } .ticket-header { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
.ticket-id { font-family: monospace; font-size: 0.8rem; color: var(--text-muted); } .ticket-desc { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 10px; }
.badges { display: flex; gap: 10px; } .badge-status { font-size: 0.7rem; padding: 2px 8px; border-radius: 100px; border: 1px solid currentColor; }
.ticket-actions { display: flex; flex-direction: column; gap: 5px; padding: 10px; border-left: 1px solid var(--border-color); background: rgba(0,0,0,0.2); }
.action-btn { width: 32px; height: 32px; border: none; background: #2a1b14; color: white; border-radius: 6px; cursor: pointer; }
.user-portal-wrapper { width: 100%; height: 100vh; overflow-y: auto; background: #0c0806; background-image: radial-gradient(circle at 50% -20%, rgba(255, 94, 0, 0.15) 0%, rgba(12, 8, 6, 1) 60%); }
.portal-header { padding: 15px 5%; background: rgba(12, 8, 6, 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 10; }
.portal-nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; width: 100%; }
.logo-area-simple { display: flex; align-items: center; gap: 10px; }
.logo-icon-simple { width: 40px; height: 40px; background: linear-gradient(135deg, #ff8a00, #ff1100); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.portal-user-actions { display: flex; align-items: center; gap: 20px; }
.user-profile-simple { display: flex; align-items: center; gap: 10px; }
.user-profile-simple img { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--border-color); }
.welcome-text { font-weight: 500; font-size: 0.95rem; display: none; } @media(min-width: 768px) { .welcome-text { display: block; } }
.btn-logout-simple { background: rgba(255,255,255,0.05); color: #ff6666; border: 1px solid rgba(255,102,102,0.2); padding: 8px 16px; border-radius: 100px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; font-weight: 500; }
.btn-logout-simple:hover { background: rgba(255,102,102,0.1); border-color: #ff6666; }
.portal-hero { padding: 60px 5% 40px; text-align: center; max-width: 800px; margin: 0 auto; }
.hero-content h1 { font-size: 2.8rem; margin-bottom: 15px; background: linear-gradient(to right, #fff, #ffb380); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero-content p { color: var(--text-muted); font-size: 1.1rem; margin-bottom: 30px; line-height: 1.5; }
.btn-hero-primary { background: linear-gradient(135deg, var(--primary-color), #ff2a00); color: white; border: none; padding: 16px 36px; border-radius: 100px; font-weight: 600; font-size: 1.1rem; cursor: pointer; box-shadow: 0 10px 25px var(--primary-glow); transition: transform 0.2s, box-shadow 0.2s; display: inline-flex; align-items: center; gap: 10px; }
.btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 15px 30px var(--primary-glow); }
.portal-body { padding: 0 5% 60px; max-width: 1000px; margin: 0 auto; }
.portal-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
.portal-tickets-section { background: rgba(20, 12, 9, 0.6); border: 1px solid var(--border-color); border-radius: 20px; padding: 30px; backdrop-filter: blur(10px); }
.section-header-portal { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
.section-header-portal h2 { font-size: 1.5rem; }
.search-bar-portal { background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 100px; padding: 10px 20px; display: flex; align-items: center; gap: 10px; min-width: 250px; }
.search-bar-portal input { background: transparent; border: none; color: white; outline: none; width: 100%; font-size: 0.95rem; }
.search-bar-portal i { color: var(--text-muted); }
.empty-state-portal { text-align: center; padding: 50px 20px; color: var(--text-muted); }
.empty-icon { font-size: 3rem; margin-bottom: 15px; color: rgba(255, 94, 0, 0.5); }
.empty-state-portal h3 { color: white; margin-bottom: 10px; font-size: 1.2rem; }
.mt-20 { margin-top: 20px; }
.btn-secondary { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: white; padding: 10px 20px; border-radius: 100px; cursor: pointer; transition: background 0.2s; }
.btn-secondary:hover { background: rgba(255,255,255,0.1); }
.modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-content { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: 20px; width: 90%; max-width: 500px; padding: 20px; }
.priority-selector { display: flex; gap: 10px; margin: 10px 0; } .priority-option { flex: 1; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; text-align: center; cursor: pointer; font-size: 0.8rem; }
.priority-option.selected { background: var(--primary-color); border-color: white; color: white; } .priority-option input { display: none; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.user-profile { background: var(--bg-panel); border-radius: 12px; padding: 10px; display: flex; align-items: center; gap: 10px; margin-top: auto; }
.user-profile img { width: 32px; height: 32px; border-radius: 50%; } .logout-btn { font-size: 0.7rem; color: #ff6666; text-decoration: none; }
`]
})
export class AppComponent implements OnInit {
  db = new SupabaseConnection();
  isAuthenticated = false; isAdmin = false; isRegistering = false;
  authEmail = ''; authPassword = ''; authError = ''; isAuthLoading = false;
  currentView = 'dashboard'; tickets: Ticket[] = []; isLoading = false;
  showNewTicketForm = false; newTicketTitle = ''; newTicketDesc = ''; newTicketPriority: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  userSearchQuery = '';
  async ngOnInit() { }
  async doLogin() {
    this.authError = ''; if (!this.authEmail || !this.authPassword) { this.authError = 'Preencha email e senha.'; return; }
    this.isAuthLoading = true; const res = await this.db.login(this.authEmail, this.authPassword); this.isAuthLoading = false;
    if (res.error) this.authError = res.error; else this.handleSuccessLogin();
  }
  async doRegister() {
    this.authError = ''; if (!this.authEmail || !this.authPassword) { this.authError = 'Preencha email e senha.'; return; }
    this.isAuthLoading = true; const res = await this.db.register(this.authEmail, this.authPassword);
    if (res.error) { this.isAuthLoading = false; this.authError = res.error; } 
    else { const loginRes = await this.db.login(this.authEmail, this.authPassword); this.isAuthLoading = false; if (loginRes.error) this.authError = loginRes.error; else this.handleSuccessLogin(); }
  }
  private handleSuccessLogin() { this.isAuthenticated = true; this.isAdmin = ADMIN_EMAILS.includes(this.authEmail.toLowerCase()); this.loadTickets(); }
  logout() { this.isAuthenticated = false; this.isAdmin = false; this.tickets = []; this.db.setSession('', ''); this.authEmail = ''; this.authPassword = ''; }
  changeView(view: string) { this.currentView = view; if (view === 'dashboard' || view === 'my_tickets') this.loadTickets(); }
  async loadTickets() { this.isLoading = true; this.tickets = await this.db.getTickets(this.isAdmin); this.isLoading = false; }
  async createTicket() {
    if (!this.newTicketTitle || !this.newTicketDesc) return;
    this.isLoading = true; await this.db.insertTicket({ title: this.newTicketTitle, description: this.newTicketDesc, status: 'OPEN', priority: this.newTicketPriority, created_at: new Date().toISOString() });
    this.newTicketTitle = ''; this.newTicketDesc = ''; this.showNewTicketForm = false; await this.loadTickets();
  }
  async updateStatus(ticket: Ticket, newStatus: string) { this.isLoading = true; await this.db.updateTicket(ticket.id, newStatus); await this.loadTickets(); }
  get totalTickets() { return this.tickets.length; } get openTickets() { return this.tickets.filter(t => t.status === 'OPEN').length; } get resolvedTickets() { return this.tickets.filter(t => t.status === 'RESOLVED').length; }
  get filteredTickets() { return this.currentView === 'my_tickets' ? this.tickets.filter(t => t.status !== 'RESOLVED') : this.tickets; }
  get filteredUserTickets() { if (!this.userSearchQuery) return this.tickets; const q = this.userSearchQuery.toLowerCase(); return this.tickets.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)); }
  getStatusLabel(s: string) { return s === 'OPEN' ? 'Aberto' : s === 'IN_PROGRESS' ? 'Em curso' : 'Resolvido'; }
  getPriorityLabel(p: string) { return p === 'HIGH' ? 'Crítica' : p === 'MEDIUM' ? 'Média' : 'Baixa'; }
  openForm() { this.showNewTicketForm = true; } closeForm() { this.showNewTicketForm = false; }
}
