import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, User, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const editProfileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  gender: z.string().min(1, "Gênero é obrigatório"),
  age: z.coerce.number({
    invalid_type_error: "Digite sua idade"
  }).min(13, "Idade mínima é 13 anos").max(120, "Idade inválida")
});

type EditProfileData = z.infer<typeof editProfileSchema>;

export default function EditProfilePage() {
  const { user, updateProfileMutation } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const form = useForm<EditProfileData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      gender: user?.gender || "",
      age: user?.age || 0,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        gender: user.gender || "",
        age: user.age || 0,
      });
      
      // Initialize profile image from user's current avatar
      if (user.avatar) {
        // If avatar is already base64 data, use it directly
        // If it's a file path, convert to full URL
        if (user.avatar.startsWith('data:')) {
          setProfileImage(user.avatar);
        } else {
          setProfileImage(user.avatar);
        }
      }
    }
  }, [user, form]);

  if (!user) {
    return <Redirect to="/auth" />;
  }

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Redimensionar para no máximo 400x400 pixels
        const maxSize = 400;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converter para blob com qualidade reduzida
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8); // 80% quality
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      
      // Verificar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }
      
      try {
        // Comprimir imagem antes de processar
        const compressedFile = await compressImage(file);
        
        // Converter para base64 para preview imediato
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target?.result as string;
          setProfileImage(base64Data);
        };
        reader.readAsDataURL(compressedFile);
        
        // Armazenar o arquivo comprimido para conversão posterior
        setPendingImage(compressedFile);
      } catch (error) {
        console.error('Erro ao comprimir imagem:', error);
        alert('Erro ao processar a imagem. Tente novamente.');
      }
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSubmit = async (data: EditProfileData) => {
    setIsSubmitting(true);
    // Clear any previous form errors
    form.clearErrors();

    let avatarBase64 = null;
    
    // Converter imagem para base64 se houver uma pendente
    if (pendingImage) {
      try {
        console.log('Convertendo imagem para base64...');
        avatarBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            resolve(result);
          };
          reader.onerror = (e) => {
            reject(new Error('Erro ao ler o arquivo de imagem'));
          };
          reader.readAsDataURL(pendingImage);
        });
        
        console.log('Imagem convertida para base64, tamanho:', avatarBase64.length);
        setPendingImage(null);
        
      } catch (error) {
        console.error('Erro ao converter imagem:', error);
        alert('Erro ao processar a imagem. Tente novamente.');
        setIsSubmitting(false);
        return;
      }
    }
    
    // Validate fields in order and focus on first error
    const fieldOrder = ['name', 'email', 'gender', 'age'] as const;
    let firstErrorField: string | null = null;
    
    // Manual validation in order
    if (!data.name || data.name.trim() === '') {
      form.setError('name', { type: 'manual', message: 'Nome é obrigatório' });
      firstErrorField = firstErrorField || 'name';
    }
    
    if (!data.email || data.email.trim() === '') {
      form.setError('email', { type: 'manual', message: 'Email é obrigatório' });
      firstErrorField = firstErrorField || 'email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      form.setError('email', { type: 'manual', message: 'Email inválido' });
      firstErrorField = firstErrorField || 'email';
    }
    
    if (!data.gender || data.gender.trim() === '') {
      form.setError('gender', { type: 'manual', message: 'Gênero é obrigatório' });
      firstErrorField = firstErrorField || 'gender';
    }
    
    const age = Number(data.age);
    if (!data.age || isNaN(age)) {
      form.setError('age', { type: 'manual', message: 'Digite sua idade' });
      firstErrorField = firstErrorField || 'age';
    } else if (age < 13) {
      form.setError('age', { type: 'manual', message: 'Idade mínima é 13 anos' });
      firstErrorField = firstErrorField || 'age';
    } else if (age > 120) {
      form.setError('age', { type: 'manual', message: 'Idade inválida' });
      firstErrorField = firstErrorField || 'age';
    }
    
    // If there are validation errors, focus on the first field with error
    if (firstErrorField) {
      setIsSubmitting(false);
      setTimeout(() => {
        const element = document.getElementById(`${firstErrorField}`);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }
    
    try {
      // Ensure age is properly converted to number and include avatar if present
      const formData = {
        ...data,
        age: Number(data.age),
        ...(avatarBase64 && { avatar: avatarBase64 })
      };
      console.log('Enviando dados do perfil com avatar:', !!avatarBase64);
      await updateProfileMutation.mutateAsync(formData);
      setLocation("/perfil");
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      
      // Handle specific server validation errors
      const errorMessage = error.message || "Erro ao atualizar perfil";
      
      if (errorMessage.includes("email") || errorMessage.includes("Email")) {
        form.setError("email", {
          type: "server",
          message: errorMessage
        });
        setTimeout(() => document.getElementById('email')?.focus(), 100);
      } else if (errorMessage.includes("nome") || errorMessage.includes("name")) {
        form.setError("name", {
          type: "server", 
          message: errorMessage
        });
        setTimeout(() => document.getElementById('name')?.focus(), 100);
      } else if (errorMessage.includes("idade") || errorMessage.includes("age")) {
        form.setError("age", {
          type: "server",
          message: errorMessage
        });
        setTimeout(() => document.getElementById('age')?.focus(), 100);
      } else if (errorMessage.includes("gênero") || errorMessage.includes("gender")) {
        form.setError("gender", {
          type: "server",
          message: errorMessage
        });
        setTimeout(() => document.getElementById('gender')?.focus(), 100);
      } else {
        // Generic error - show on the name field as it's the first one
        form.setError("name", {
          type: "server",
          message: errorMessage
        });
        setTimeout(() => document.getElementById('name')?.focus(), 100);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/perfil")}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para perfil
            </Button>
          </div>

          {/* Edit Profile Card */}
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      Editar Perfil
                    </CardTitle>
                    <p className="text-muted-foreground">
                      Atualize suas informações pessoais
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-6">
                  {/* Foto do Perfil */}
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <div className="relative">
                        <input
                          type="file"
                          name="profileImage"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                          title="Alterar foto do perfil"
                          id="profile-image-input"
                        />
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-primary to-accent flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                          {profileImage ? (
                            <img
                              src={profileImage}
                              alt="Foto do perfil"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-2xl font-bold">
                              {user ? getUserInitials(user.name) : 'U'}
                            </span>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors z-20">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Clique na foto ou no ícone da câmera para alterar
                    </p>
                  </div>

                  {/* Nome Completo */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      data-testid="input-edit-name"
                      {...form.register("name")}
                      placeholder="Digite seu nome completo"
                      className="h-11"
                      autoComplete="off"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      data-testid="input-edit-email"
                      type="text"
                      {...form.register("email")}
                      placeholder="Digite seu email"
                      className="h-11"
                      autoComplete="off"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Gênero e Idade */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gênero</Label>
                      <Select 
                        onValueChange={(value) => form.setValue("gender", value)}
                        defaultValue={form.getValues("gender")}
                      >
                        <SelectTrigger id="gender" className="h-11">
                          <SelectValue placeholder="Selecione seu gênero" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.gender && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.gender.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="age">Idade</Label>
                      <Input
                        id="age"
                        data-testid="input-edit-age"
                        type="text"
                        {...form.register("age", { valueAsNumber: true })}
                        placeholder="Digite sua idade"
                        className="h-11"
                        autoComplete="off"
                      />
                      {form.formState.errors.age && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.age.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/perfil")}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || updateProfileMutation.isPending}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      {isSubmitting || updateProfileMutation.isPending ? (
                        "Salvando..."
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}