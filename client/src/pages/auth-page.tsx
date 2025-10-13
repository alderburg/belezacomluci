import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Sparkles, Star, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória")
});
const registerSchema = z.object({
  name: z.string().min(1, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  gender: z.string().min(1, "Gênero é obrigatório"),
  age: z.coerce.number({
    invalid_type_error: "Digite sua idade"
  }).min(13, "Idade mínima é 13 anos").max(120, "Idade inválida")
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [, setLocation] = useLocation();
  
  // Capturar parâmetro de referência da URL
  const urlParams = new URLSearchParams(window.location.search);
  const referralId = urlParams.get('ref');

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "", name: "", confirmPassword: "", gender: "", age: "" as any },
  });

  useEffect(() => {
    if (user) return;
    
    // Se há uma referência, mudar para aba de cadastro e mostrar mensagem
    if (referralId) {
      setActiveTab("register");
    }
  }, [referralId]);

  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterData) => {
    // Generate username from email (part before @)
    const username = data.email.split('@')[0].toLowerCase();
    
    // Remove confirmPassword and add username
    const { confirmPassword, ...registerData } = data;
    const finalData = { 
      ...registerData, 
      username,
      referralId: referralId || undefined // Incluir ID de referência se existir
    };
    
    registerMutation.mutate(finalData as any);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      {/* Left Panel - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 to-accent/20 items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="gradient-primary rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-8">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-4xl font-bold text-foreground mb-6">
            Bem-vinda ao mundo da beleza
          </h2>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Descubra conteúdos exclusivos, produtos digitais incríveis e cupons especiais. 
            Junte-se à nossa comunidade de beleza!
          </p>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center space-x-4 p-4 bg-white/50 rounded-lg">
              <div className="gradient-gold rounded-full w-12 h-12 flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Conteúdo Exclusivo</h3>
                <p className="text-sm text-muted-foreground">Vídeos e tutoriais premium</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white/50 rounded-lg">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-12 h-12 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Comunidade Ativa</h3>
                <p className="text-sm text-muted-foreground">Conecte-se com outras pessoas</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white/50 rounded-lg">
              <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-full w-12 h-12 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Cupons Especiais</h3>
                <p className="text-sm text-muted-foreground">Descontos em suas marcas favoritas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Beleza com Luci</h1>
            <p className="text-muted-foreground">Sua plataforma de beleza exclusiva</p>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-xl">
                Acesse sua conta
              </CardTitle>
              {referralId && (
                <div className="bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200 rounded-lg p-3 mt-2">
                  <p className="text-sm text-center text-pink-700">
                    🎉 Você foi convidada por uma cheirosa! Cadastre-se e ganhe pontos extras!
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="tab-login">Entrar</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        data-testid="input-login-email"
                        type="email"
                        {...loginForm.register("email")}
                        placeholder="Digite seu email"
                        className="h-11"
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <Input
                        id="login-password"
                        data-testid="input-login-password"
                        type="password"
                        {...loginForm.register("password")}
                        placeholder="Digite sua senha"
                        className="h-11"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      data-testid="button-login"
                      className="w-full h-11 bg-primary hover:bg-primary/90"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nome Completo</Label>
                      <Input
                        id="register-name"
                        data-testid="input-register-name"
                        {...registerForm.register("name")}
                        placeholder="Digite seu nome completo"
                        className="h-11"
                      />
                      {registerForm.formState.errors.name && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>


                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        data-testid="input-register-email"
                        type="email"
                        {...registerForm.register("email")}
                        placeholder="Digite seu email"
                        className="h-11"
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-gender">Gênero</Label>
                        <Select 
                          onValueChange={(value) => registerForm.setValue("gender", value)}
                          defaultValue={registerForm.getValues("gender")}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione seu gênero" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="feminino">Feminino</SelectItem>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        {registerForm.formState.errors.gender && (
                          <p className="text-sm text-destructive">
                            {registerForm.formState.errors.gender.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-age">Idade</Label>
                        <Input
                          id="register-age"
                          data-testid="input-register-age"
                          type="number"
                          min="13"
                          max="120"
                          {...registerForm.register("age", { valueAsNumber: true })}
                          placeholder="Sua idade"
                          className="h-11"
                        />
                        {registerForm.formState.errors.age && (
                          <p className="text-sm text-destructive">
                            {registerForm.formState.errors.age.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Senha</Label>
                      <Input
                        id="register-password"
                        data-testid="input-register-password"
                        type="password"
                        {...registerForm.register("password")}
                        placeholder="Crie uma senha segura"
                        className="h-11"
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">Repetir Senha</Label>
                      <Input
                        id="register-confirm-password"
                        data-testid="input-register-confirm-password"
                        type="password"
                        {...registerForm.register("confirmPassword")}
                        placeholder="Digite a senha novamente"
                        className="h-11"
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      data-testid="button-register"
                      className="w-full h-11 bg-primary hover:bg-primary/90"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Cadastrando..." : "Criar Conta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
