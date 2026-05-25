import PublicLegalLayout from "@/components/legal/PublicLegalLayout";

export default function TermsPage() {
  return (
    <PublicLegalLayout title="Termos de Uso" version="0.1" lastUpdated="25/05/2026">
      <h2>1. Definições</h2>
      <ul>
        <li>
          <strong>ChatPsi:</strong> plataforma SaaS de apoio a profissionais de saúde mental,
          operada por <strong>SECONSULT TECNOLOGIA E SAÚDE LTDA</strong> (CNPJ 40.044.401/0001-68).
        </li>
        <li>
          <strong>Usuário:</strong> profissional de saúde mental (psicólogo, psiquiatra ou
          correlato) regularmente inscrito em seu conselho profissional, maior de idade.
        </li>
        <li><strong>Paciente:</strong> pessoa cujos dados clínicos são inseridos pelo Usuário no ChatPsi.</li>
        <li>
          <strong>IA:</strong> funcionalidades de inteligência artificial integradas (OpenAI Whisper,
          Chat Completions, Assistants API).
        </li>
      </ul>

      <h2>2. Aceitação</h2>
      <p>
        Ao criar conta, o Usuário declara ter lido, compreendido e aceitado integralmente estes
        Termos e a <a href="/politica-de-privacidade">Política de Privacidade</a>. O aceite é
        registrado com data, hora e versão do documento.
      </p>

      <h2>3. Requisitos do Usuário</h2>
      <ul>
        <li>Profissional de saúde mental com registro ativo em conselho (CRP, CRM, etc.)</li>
        <li>Maior de idade</li>
        <li>Informações verdadeiras no cadastro</li>
        <li>Sigilo da senha</li>
      </ul>

      <h2>4. Funcionalidades e limitações da IA</h2>
      <h3>4.1. Natureza auxiliar</h3>
      <p>
        O ChatPsi é uma <strong>ferramenta de apoio</strong>. Todo conteúdo gerado por IA — em
        especial evoluções clínicas, planos de ação e respostas do chat clínico — <strong>deve ser
        revisado pelo profissional antes de ser considerado documento clínico válido</strong>. A IA
        pode cometer erros, omitir informações ou gerar conteúdo inadequado ao caso.
      </p>
      <h3>4.2. Responsabilidade clínica</h3>
      <p>
        A responsabilidade técnica, ética e legal pelo prontuário, pelas decisões clínicas e pelas
        comunicações com o paciente é <strong>exclusiva do Usuário</strong>. O ChatPsi não substitui
        o juízo clínico do profissional.
      </p>
      <h3>4.3. Decisões automatizadas (Art. 20 LGPD)</h3>
      <p>
        Nenhuma decisão clínica é tomada de forma exclusivamente automatizada. Toda evolução
        gerada pela IA é apresentada ao Usuário para revisão antes de ser salva.
      </p>

      <h2>5. Dados de paciente</h2>
      <p>O Usuário declara e garante que:</p>
      <ul>
        <li>Possui base legal apropriada (consentimento informado do paciente, Art. 11 LGPD) para inserir dados clínicos</li>
        <li>Informou o paciente sobre o uso de ferramentas de IA na produção do prontuário</li>
        <li>Informou o paciente sobre eventual transferência internacional de dados clínicos para OpenAI nos EUA</li>
        <li>NÃO insere nome completo do paciente — apenas iniciais</li>
        <li>É responsável por manter os direitos do titular (paciente) atendidos no prazo legal</li>
      </ul>

      <h2>6. Vedações</h2>
      <p>É vedado ao Usuário:</p>
      <ul>
        <li>Compartilhar a conta com terceiros</li>
        <li>Usar o ChatPsi para finalidade diversa de apoio à prática clínica regular</li>
        <li>Inserir dados de pessoas que não sejam seus pacientes</li>
        <li>Usar dados extraídos para fins comerciais, de pesquisa ou divulgação sem consentimento do titular</li>
        <li>Tentar acessar dados de outros usuários, fazer engenharia reversa, testes de intrusão sem autorização prévia por escrito</li>
        <li>Inserir conteúdo ilícito, ofensivo, discriminatório ou que viole direitos de terceiros</li>
      </ul>

      <h2>7. Propriedade intelectual</h2>
      <ul>
        <li>O software do ChatPsi e elementos visuais são de propriedade do operador da plataforma.</li>
        <li>O conteúdo clínico produzido pelo Usuário é de propriedade do Usuário/paciente.</li>
        <li>
          Atualmente <strong>NÃO usamos</strong> dados do ChatPsi para treinamento de modelos
          (opt-out por padrão).
        </li>
      </ul>

      <h2>8. Assinatura, pagamento e cancelamento</h2>
      <p>Os planos e valores são detalhados na página de planos. O cancelamento pode ser feito a qualquer momento via <code>/app/perfil</code>. Dados clínicos permanecem armazenados pelo prazo legal (20 anos — Res. CFP 001/2009) mesmo após cancelamento.</p>

      <h2>9. Suspensão e rescisão</h2>
      <p>
        Podemos suspender ou encerrar a conta em caso de violação destes Termos, inadimplemento
        prolongado, suspeita de uso fraudulento ou determinação judicial. Você será notificado e
        terá acesso para exportar seus dados (Art. 18, V LGPD).
      </p>

      <h2>10. Limitação de responsabilidade</h2>
      <p>O ChatPsi não se responsabiliza por:</p>
      <ul>
        <li>Decisões clínicas baseadas exclusivamente em conteúdo de IA sem revisão profissional</li>
        <li>Indisponibilidade por causas externas (provedores de hospedagem, OpenAI)</li>
        <li>Uso indevido das credenciais do Usuário</li>
      </ul>

      <h2>11. Alterações</h2>
      <p>
        Alterações relevantes serão notificadas por e-mail e dentro do app, com no mínimo 30 dias
        de antecedência. O uso continuado implica aceite da nova versão.
      </p>

      <h2>12. Contato</h2>
      <p>
        <strong>Controlador:</strong> SECONSULT TECNOLOGIA E SAÚDE LTDA — CNPJ 40.044.401/0001-68
        — Endereço: Rua Sete de Setembro, 543 — Apt 121, Centro, Sorocaba/SP, CEP 18035-001.
      </p>
      <p>
        <strong>Encarregado (DPO):</strong> &lt;NOME COMPLETO DO ENCARREGADO&gt; — e-mail{" "}
        <a href="mailto:seconsult.clinica@gmail.com">seconsult.clinica@gmail.com</a> (preferencial)
        · WhatsApp (secundário){" "}
        <a href="https://wa.me/5511942457454" target="_blank" rel="noopener noreferrer">
          11 94245-7454
        </a>
        .
      </p>

      <hr />
      <p className="text-sm text-muted-foreground">Versão 0.1 — 25/05/2026. Em validação jurídica.</p>
    </PublicLegalLayout>
  );
}
