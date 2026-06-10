interface Lead {
  id: string;
  telegramUsername?: string | null;
  firstName?: string | null;
  telegramFirstName?: string | null;
  status: string;
  starts?: number;
  pixCount?: number;
  lastPayment?: { amount: number; status: string } | null;
  paidAt?: string | null;
  createdAt: string;
}

interface LeadsTableProps {
  leads: Lead[];
  botId: string;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  started:       { label: 'Iniciou',    color: '#7878A0', bg: 'rgba(120,120,160,0.1)' },
  pix_generated: { label: 'PIX Gerado', color: '#00E5FF', bg: 'rgba(0,229,255,0.08)'  },
  generated_pix: { label: 'PIX Gerado', color: '#00E5FF', bg: 'rgba(0,229,255,0.08)'  },
  paid:          { label: 'Pagou',      color: '#BFFF00', bg: 'rgba(191,255,0,0.08)'  },
  failed:        { label: 'Falhou',     color: '#FF3B4E', bg: 'rgba(255,59,78,0.08)'  },
};

export default function LeadsTable({ leads }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#404060', fontSize: '14px' }}>Nenhum lead registrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700 }}>Leads Recentes</span>
        <span className="mono" style={{ fontSize: '11px', color: '#404060', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '20px' }}>
          {leads.length}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>USUÁRIO</th>
              <th>STATUS</th>
              <th>ÚLTIMO PAGAMENTO</th>
              <th>STARTS</th>
              <th>DATA</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const cfg = STATUS_CFG[lead.status] ?? { label: lead.status, color: '#505070', bg: 'rgba(255,255,255,0.04)' };
              const name = lead.firstName || lead.telegramFirstName || '—';
              const user = lead.telegramUsername ? `@${lead.telegramUsername}` : null;

              return (
                <tr key={lead.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#EEEEF8' }}>{name}</div>
                    {user && <div className="mono" style={{ fontSize: '11px', color: '#505070', marginTop: '2px' }}>{user}</div>}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px',
                      background: cfg.bg, color: cfg.color,
                    }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: '13px', color: lead.lastPayment?.status === 'paid' ? '#BFFF00' : '#505070' }}>
                    {lead.lastPayment ? `R$ ${lead.lastPayment.amount.toFixed(2).replace('.', ',')}` : '—'}
                  </td>
                  <td className="mono" style={{ fontSize: '13px', color: '#7878A0' }}>
                    {lead.starts ?? '—'}
                  </td>
                  <td className="mono" style={{ fontSize: '12px', color: '#404060' }}>
                    {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
