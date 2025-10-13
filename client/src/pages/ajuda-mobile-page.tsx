import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { 
  ArrowLeft, 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDataSync } from "@/hooks/use-data-sync";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function AjudaMobilePage() {
  useDataSync();

  const [, setLocation] = useLocation();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqs: FAQ[] = [
    {
      id: "1",
      question: "Como faço para me tornar Premium?",
      answer: "Para se tornar Premium, entre em contato com nosso suporte através do WhatsApp ou e-mail. Nossa equipe irá ajudá-lo com o processo de upgrade e informar sobre os benefícios exclusivos."
    },
    {
      id: "2",
      question: "Como recuperar minha senha?",
      answer: "Na tela de login, clique em 'Esqueci minha senha' e siga as instruções enviadas para seu e-mail cadastrado."
    },
    {
      id: "3",
      question: "Onde encontro meus cupons?",
      answer: "Seus cupons estão disponíveis na seção 'Cupons' do menu principal. Lá você pode visualizar todos os cupons ativos e suas condições de uso."
    },
    {
      id: "4",
      question: "Como funciona o sistema de pontos?",
      answer: "Você ganha pontos ao completar desafios e interagir com o conteúdo. Esses pontos podem ser trocados por recompensas exclusivas na seção Minhas Cheirosas."
    },
    {
      id: "5",
      question: "Como baixar produtos digitais?",
      answer: "Acesse a seção 'Produtos Digitais' e clique no produto desejado. Os produtos premium requerem assinatura ativa para download."
    }
  ];

  const handleBackClick = () => {
    setLocation('/mobile-menu');
  };

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Ajuda e Suporte</h1>
            <p className="text-sm text-muted-foreground">Estamos aqui para ajudar</p>
          </div>
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pt-24 pb-4 space-y-6">
        {/* Contact Options */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground mb-3">Entre em Contato</h2>
          
          <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100/50 border border-green-200/50 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-foreground">WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">Atendimento rápido e direto</p>
                </div>
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100/50 border border-blue-200/50 rounded-lg">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-foreground">E-mail</h3>
                  <p className="text-sm text-muted-foreground">suporte@belezacomluci.com</p>
                </div>
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100/50 border border-purple-200/50 rounded-lg">
                  <Phone className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-foreground">Telefone</h3>
                  <p className="text-sm text-muted-foreground">Seg a Sex, 9h às 18h</p>
                </div>
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQs */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground mb-3">Perguntas Frequentes</h2>
          
          {faqs.map((faq) => (
            <Card key={faq.id}>
              <CardContent className="p-0">
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors rounded-lg"
                >
                  <span className="text-sm font-medium text-foreground pr-2">
                    {faq.question}
                  </span>
                  {expandedFAQ === faq.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {expandedFAQ === faq.id && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Help */}
        <Card className="bg-pink-50/50 border-pink-200/50">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">Precisa de mais ajuda?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Nossa equipe está pronta para atendê-lo. Entre em contato através de qualquer um dos canais acima.
            </p>
            <div className="text-xs text-muted-foreground">
              <p><strong>Horário de Atendimento:</strong></p>
              <p>Segunda a Sexta: 9h às 18h</p>
              <p>Sábado: 9h às 13h</p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
