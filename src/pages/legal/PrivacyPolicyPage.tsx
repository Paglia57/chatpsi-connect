import PublicLegalLayout from "@/components/legal/PublicLegalLayout";
import DpoContactBlock from "@/components/legal/DpoContactBlock";

export default function PrivacyPolicyPage() {
  return (
    <PublicLegalLayout
      title="Política de Privacidade"
      version="0.1"
      lastUpdated="25/05/2026"
    >
      <h2>1. Controlador</h2>
      <p>O ChatPsi é operado pelo seguinte Controlador (Art. 5º, VI LGPD):</p>
      <p>
        <strong>SECONSULT TECNOLOGIA E SAÚDE LTDA</strong><br />
        CNPJ: 40.044.401/0001-68<br />
        Endereço: Rua Sete de Setembro, 543 — Apt 121, Centro, Sorocaba/SP, CEP 18035-001
      </p>
      <p>
        O ChatPsi é um software como serviço (SaaS) destinado exclusivamente a profissionais de
        saúde mental (psicólogos, psiquiatras e correlatos) regularmente inscritos em seus
        respectivos conselhos profissionais. A SECONSULT atua como <strong>Controlador</strong> dos
        dados dos profissionais assinantes e como <strong>Operador</strong> dos dados de pacientes
        inseridos pelos profissionais (relação detalhada nos Termos de Uso).
      </p>

      <h2 id="dpo">2. Encarregado pelo Tratamento de Dados (DPO)</h2>
      <p>
        Em conformidade com o Art. 41 da LGPD e Resolução CD/ANPD 18/2024, a SECONSULT nomeou como
        Encarregado pelo Tratamento de Dados:
      </p>
      <DpoContactBlock variant="full" className="not-prose my-4" />

      <h2>3. Quais dados tratamos</h2>
      <h3>3.1. Dados do profissional assinante</h3>
      <ul>
        <li>Identificação: nome, e-mail, telefone, foto opcional</li>
        <li>Profissional: CRP, especialidades, abordagem terapêutica</li>
        <li>Assinatura: plano, status, datas, histórico</li>
        <li>Autenticação: hash de senha gerenciado pela Supabase Auth</li>
      </ul>
      <h3>3.2. Dados dos pacientes (dado sensível de saúde)</h3>
      <ul>
        <li>Iniciais do paciente (não nome completo), data de nascimento, gênero</li>
        <li>Quadro clínico: CID-10, DSM-5-TR, queixa principal, medicação</li>
        <li>Prontuários: evoluções clínicas geradas pela IA + revisões</li>
        <li>Áudios de sessão (quando o profissional escolhe persistir)</li>
        <li>Conversas com IA sobre o caso</li>
      </ul>
      <p>
        <strong>Importante:</strong> não solicitamos nome completo do paciente. Recomendamos uso
        exclusivo de iniciais (princípio da necessidade — Art. 6º, III LGPD).
      </p>

      <h2>4. Finalidades e bases legais</h2>
      <ul>
        <li>Cadastro e operação da conta — Art. 7º, V (execução de contrato)</li>
        <li>Gestão de prontuário clínico — <strong>Art. 11, II, "a"</strong> (tutela da saúde por profissional habilitado)</li>
        <li>Transcrição de áudio (Whisper) — Art. 11, II, "a" + Art. 6º, III</li>
        <li>Geração e refinamento de evolução por IA — Art. 11, II, "a"</li>
        <li>Comunicações transacionais — Art. 7º, V</li>
        <li>Marketing/comunicações comerciais — Art. 7º, I (consentimento)</li>
        <li>Cookies analíticos opcionais — Art. 7º, I (consentimento)</li>
        <li>Logs de auditoria e segurança — Art. 7º, IX (legítimo interesse)</li>
      </ul>

      <h2>5. Compartilhamento e operadores</h2>
      <p>
        Compartilhamos dados com operadores essenciais ao serviço, sob contrato (DPA — Art. 39 LGPD):
      </p>
      <ul>
        <li>
          <strong>Supabase (Supabase Inc.)</strong> — hospedagem (banco, autenticação, storage,
          edge functions). DPA padrão (em assinatura).
        </li>
        <li>
          <strong>OpenAI (OpenAI LLC)</strong> — transcrição de áudio (Whisper) + geração e
          refinamento de evoluções (Chat Completions / Assistants API). Servidores nos{" "}
          <strong>Estados Unidos</strong>.
        </li>
      </ul>
      <p>
        <strong>Transferência internacional para os Estados Unidos</strong> (Art. 33 LGPD): há fluxo
        de dados clínicos para a OpenAI. Estamos em processo de formalização das Cláusulas-Padrão
        Contratuais (SCCs) da Resolução CD/ANPD 19/2024. Avalie esse risco ao decidir usar o serviço
        com pacientes que considerem essa transferência inaceitável.
      </p>
      <p>Não compartilhamos dados para marketing de terceiros, score de crédito ou qualquer finalidade não declarada.</p>

      <h2>6. Por quanto tempo guardamos seus dados</h2>
      <ul>
        <li><strong>Prontuário clínico:</strong> 20 anos após a última sessão (Resolução CFP 001/2009)</li>
        <li><strong>Histórico de revisões:</strong> 20 anos (vinculado ao prontuário)</li>
        <li><strong>Dados do profissional ativo:</strong> duração do contrato + 5 anos (CDC)</li>
        <li><strong>Logs de auditoria:</strong> 5 anos</li>
        <li><strong>Conversas de chat com IA:</strong> 12 meses (em revisão)</li>
        <li><strong>Cookies analíticos:</strong> 12 meses</li>
      </ul>

      <h2>7. Seus direitos como titular (Art. 18 LGPD)</h2>
      <ol>
        <li>Confirmação da existência de tratamento</li>
        <li>Acesso aos dados</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos</li>
        <li>Portabilidade dos dados a outro fornecedor</li>
        <li>Eliminação dos dados tratados com base no consentimento</li>
        <li>Informação sobre entidades com as quais compartilhamos dados</li>
        <li>Informação sobre a possibilidade de não consentir e suas consequências</li>
        <li>Revogação do consentimento (Art. 8º, §5º) — tão simples quanto a sua concessão</li>
      </ol>
      <p>
        <strong>Como exercer:</strong> e-mail ao Encarregado (
        <a href="mailto:seconsult.clinica@gmail.com">seconsult.clinica@gmail.com</a> — canal
        preferencial), WhatsApp secundário 11&nbsp;94245-7454, ou — em breve — portal de direitos
        em <code>/direitos-do-titular</code>. O RIPD (Relatório de Impacto à Proteção de Dados)
        está disponível mediante solicitação ao Encarregado.
      </p>
      <p>
        <strong>Prazo de resposta:</strong> até 15 dias corridos (Art. 19, II LGPD). A eliminação
        pode ser limitada pela obrigação de retenção da Resolução CFP 001/2009 (20 anos para
        prontuário).
      </p>

      <h2>8. Segurança</h2>
      <ul>
        <li>Criptografia em trânsito (TLS 1.2+)</li>
        <li>Criptografia em repouso (AES-256 no Postgres e Storage da Supabase)</li>
        <li>Controle de acesso por linha (RLS) no banco</li>
        <li>Autenticação gerenciada pela Supabase Auth (JWT, hash seguro)</li>
        <li>Logs de auditoria de acessos administrativos</li>
        <li>Backups automáticos diários</li>
        <li>Sanitização de logs no frontend</li>
      </ul>

      <h2>9. Incidentes de segurança</h2>
      <p>
        Em caso de incidente que possa acarretar risco ou dano relevante (Art. 48 LGPD + Res. CD/ANPD 15/2024),
        comunicaremos à ANPD e aos titulares afetados em até 3 dias úteis.
      </p>

      <h2>10. Cookies</h2>
      <p>
        Veja nossa <a href="/cookies">Política de Cookies</a> para detalhes sobre cookies necessários
        e opcionais, e como gerenciar suas preferências.
      </p>

      <h2>11. Crianças e adolescentes</h2>
      <p>
        O ChatPsi é destinado a profissionais maiores de idade. Pacientes menores podem ser
        registrados pelo profissional, sob sua responsabilidade clínica e mediante consentimento
        dos responsáveis legais quando aplicável (Art. 14 LGPD).
      </p>

      <h2>12. Alterações</h2>
      <p>
        Esta política pode ser atualizada. Notificaremos alterações relevantes por e-mail e dentro
        do app. O histórico de versões é mantido no nosso repositório
        (<code>docs/lgpd/POLITICA-DE-PRIVACIDADE.md</code>).
      </p>

      <hr />
      <p className="text-sm text-muted-foreground">
        Versão 0.1 — 25/05/2026. Em validação jurídica.
      </p>
    </PublicLegalLayout>
  );
}
