import PDFDocument from 'pdfkit';
import { leadsService } from './leads.service.js';

const EVENT_LABEL: Record<string, string> = {
  started: 'Deu /start', plan_selected: 'Escolheu o plano', pix_generated: 'Gerou o PIX',
  paid: 'Pagamento confirmado', access_granted: 'Acesso liberado', renewal_offered: 'Oferta de renovação',
  access_expired: 'Acesso expirou', removed: 'Removido do canal', blocked: 'Bloqueou o bot',
};

const fmt = (d: any) => d ? new Date(d).toLocaleString('pt-BR') : '—';

// Gera um PDF (Buffer) com a timeline completa do lead — para defesa de MED/chargeback.
export async function buildLeadReport(userId: string, leadId: string): Promise<{ buffer: Buffer; lead: any }> {
  const lead: any = await leadsService.getLeadTimeline(userId, leadId);

  const buffer: Buffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const h2 = (t: string) => { doc.moveDown(0.6).fontSize(13).fillColor('#111').text(t); doc.moveDown(0.2).fontSize(10).fillColor('#333'); };
    const kv = (k: string, v: string) => doc.fillColor('#666').text(`${k}: `, { continued: true }).fillColor('#111').text(v);

    // Cabeçalho
    doc.fontSize(19).fillColor('#0a0a18').text('Relatório do Lead — BOTZZIN');
    doc.fontSize(9).fillColor('#888').text(`Gerado em ${new Date().toLocaleString('pt-BR')}`);
    doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#dddddd').stroke();

    // Identificação
    h2('Identificação');
    kv('Nome', lead.firstName || '—');
    kv('Username', lead.telegramUsername ? '@' + lead.telegramUsername : '—');
    kv('Telegram ID', String(lead.telegramUserId));
    kv('Lead ID', lead.id);
    kv('Bot', '@' + (lead.bot?.telegramUsername || ''));
    kv('Status', lead.blockedAt ? 'Bloqueado' : lead.paidAt ? 'Convertido' : 'Pendente');

    // Datas
    h2('Datas');
    kv('Start', fmt(lead.createdAt));
    kv('Pagamento', fmt(lead.paidAt));
    kv('Acesso expira', fmt(lead.accessExpiresAt));
    kv('Removido', fmt(lead.removedAt));
    kv('Bloqueado', fmt(lead.blockedAt));

    // Pagamentos (com E2E — defesa MED)
    h2('Pagamentos');
    if (lead.payments?.length) {
      lead.payments.forEach((p: any) => {
        doc.fillColor('#111').fontSize(11).text(`R$ ${Number(p.amount).toFixed(2)} — ${p.status}`);
        doc.fontSize(9).fillColor('#444');
        if (p.plan) doc.text(`Plano: ${p.plan.name} (${p.plan.days} dias)`);
        if (p.endToEndId) doc.fillColor('#0a7').text(`E2E: ${p.endToEndId}`).fillColor('#444');
        else if (p.gatewayTxId) doc.text(`Transação: ${p.gatewayTxId}`);
        doc.text(`Criado: ${fmt(p.createdAt)}   Pago: ${fmt(p.paidAt)}`);
        doc.moveDown(0.4).fontSize(10);
      });
    } else { doc.text('Nenhum pagamento.'); }

    // Histórico
    h2('Histórico de eventos');
    if (lead.events?.length) {
      lead.events.forEach((e: any) => {
        const label = EVENT_LABEL[e.type] || e.type;
        doc.fillColor('#111').text(`• ${label}`, { continued: true }).fillColor('#999').text(`   ${fmt(e.createdAt)}`);
      });
    } else { doc.text('Sem eventos registrados.'); }

    doc.moveDown(1.2);
    doc.fontSize(8).fillColor('#aaa').text('Documento gerado automaticamente pelo BOTZZIN para fins de comprovação de entrega e defesa de disputa (MED/chargeback).', { align: 'center' });

    doc.end();
  });

  return { buffer, lead };
}
