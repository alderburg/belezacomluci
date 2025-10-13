import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, User, Camera, Plus, Trash2, MapPin, Globe } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import BannerCarousel from "@/components/banner-carousel";
import { PopupSystem } from "@/components/popup-system";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Zod schema for comprehensive form validation
const socialNetworkSchema = z.object({
  type: z.enum(['instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'linkedin', 'pinterest', 'snapchat', 'whatsapp', 'telegram'], {
    required_error: "Selecione um tipo de rede social"
  }),
  url: z.string().min(1, "Campo obrigatório")
}).refine((data) => {
  // Se for WhatsApp ou Telegram, validar como telefone
  if (data.type === 'whatsapp' || data.type === 'telegram') {
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return phoneRegex.test(data.url);
  }
  // Para outras redes sociais, validar como URL
  try {
    new URL(data.url);
    return true;
  } catch {
    return false;
  }
}, {
  message: "Formato inválido",
  path: ["url"]
});

const meuPerfilSchema = z.object({
  // Personal info
  name: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string()
    .min(1, "CPF é obrigatório")
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve ter o formato 000.000.000-00")
    .refine((cpf) => {
      // Remove formatting
      const digits = cpf.replace(/\D/g, '');

      // Check if it's 11 digits
      if (digits.length !== 11) return false;

      // Check if all digits are the same
      if (/^(\d)\1{10}$/.test(digits)) return false;

      // Validate CPF algorithm
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(digits[i]) * (10 - i);
      }
      let remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(digits[9])) return false;

      sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(digits[i]) * (11 - i);
      }
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(digits[10])) return false;

      return true;
    }, "CPF inválido"),
  email: z.string().email("Email inválido"),
  gender: z.string().min(1, "Gênero é obrigatório"),
  age: z.coerce.number({
    invalid_type_error: "Digite sua idade"
  }).min(13, "Idade mínima é 13 anos").max(120, "Idade inválida"),

  // Contact info
  phone: z.string().min(1, "Telefone é obrigatório"),

  // Address info
  zipCode: z.string()
    .min(1, "CEP é obrigatório")
    .regex(/^\d{5}-?\d{3}$/, "CEP deve ter o formato 00000-000"),
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),

  // Social networks
  socialNetworks: z.array(socialNetworkSchema).optional().default([])
});

type MeuPerfilData = z.infer<typeof meuPerfilSchema>;

const SOCIAL_NETWORK_OPTIONS = [
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'youtube', label: 'YouTube', icon: '📺' },
  { value: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'pinterest', label: 'Pinterest', icon: '📌' },
  { value: 'snapchat', label: 'Snapchat', icon: '👻' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'telegram', label: 'Telegram', icon: '✈️' }
];

export default function MeuPerfilPage() {
  const { user, updateProfileMutation } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const { toast } = useToast();

  // Banner logic - same as other pages
  const { data: banners } = useQuery<any[]>({
    queryKey: ["/api/banners"],
  });

  // Verificar se há banners ativos na página profile (ou usar uma página específica se houver)
  const activeBanners = banners?.filter((banner: any) => banner.isActive && banner.page === "profile") || [];
  const hasActiveBanners = activeBanners.length > 0;

  const form = useForm<MeuPerfilData>({
    resolver: zodResolver(meuPerfilSchema),
    mode: 'onSubmit',
    defaultValues: {
      name: "",
      cpf: "",
      email: "",
      gender: "",
      age: 0,
      phone: "",
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      socialNetworks: []
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "socialNetworks"
  });

  useEffect(() => {
    if (user) {
      const formData = {
        name: user.name || "",
        cpf: user.cpf || "",
        email: user.email || "",
        gender: user.gender || "",
        age: user.age || 0,
        phone: user.phone || "",
        zipCode: user.zipCode || "",
        street: user.street || "",
        number: user.number || "",
        complement: user.complement || "",
        neighborhood: user.neighborhood || "",
        city: user.city || "",
        state: user.state || "",
        socialNetworks: user.socialNetworks || []
      };

      console.log('Dados do usuário carregados:', {
        name: user.name,
        email: user.email,
        gender: user.gender,
        age: user.age
      });

      // Reset form with all data
      form.reset(formData);

      // Set profile image if exists
      if (user.avatar && !profileImage) {
        setProfileImage(user.avatar);
      }
    }
  }, [user, form, profileImage]);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Resize to maximum 400x400 pixels
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

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with reduced quality
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
        }, 'image/jpeg', 0.8);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      try {
        const compressedFile = await compressImage(file);

        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target?.result as string;
          setProfileImage(base64Data);
        };
        reader.readAsDataURL(compressedFile);

        setPendingImage(compressedFile);
      } catch (error) {
        console.error('Erro ao comprimir imagem:', error);
        toast({
          title: "Erro ao processar imagem",
          description: "Não foi possível processar a imagem. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const addSocialNetwork = () => {
    append({ type: 'instagram', url: '' });
  };

  const removeSocialNetwork = (index: number) => {
    remove(index);
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSubmit = async (data: MeuPerfilData) => {
    setIsSubmitting(true);
    form.clearErrors();

    let avatarBase64 = null;

    if (pendingImage) {
      try {
        avatarBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            resolve(result);
          };
          reader.onerror = () => {
            reject(new Error('Erro ao ler o arquivo de imagem'));
          };
          reader.readAsDataURL(pendingImage);
        });

        setPendingImage(null);
      } catch (error) {
        console.error('Erro ao converter imagem:', error);
        toast({
          title: "Erro ao processar imagem",
          description: "Não foi possível processar a imagem. Tente novamente.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const updateData = {
        ...data,
        ...(avatarBase64 && { avatar: avatarBase64 })
      };

      await updateProfileMutation.mutateAsync(updateData);
      setLocation('/perfil');
    } catch (error) {
      console.error('Profile update error:', error);
      // O toast de erro já é tratado na mutation do useAuth
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSocialNetworkIcon = (type: string) => {
    const network = SOCIAL_NETWORK_OPTIONS.find(n => n.value === type);
    return network?.icon || '🌐';
  };

  const getSocialNetworkLabel = (type: string) => {
    const network = SOCIAL_NETWORK_OPTIONS.find(n => n.value === type);
    return network?.label || type;
  };

  // Function to format phone number
  const formatPhoneNumber = (value: string) => {
    if (!value) return '';

    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Limit to 11 digits maximum (Brazilian phone numbers)
    const limitedDigits = digits.slice(0, 11);
    const size = limitedDigits.length;

    // Format based on number of digits
    if (size <= 2) {
      return limitedDigits;
    }
    if (size <= 6) {
      return limitedDigits.replace(/(\d{2})(\d+)/, '($1) $2');
    }
    if (size <= 10) {
      return limitedDigits.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
    }
    // 11 digits (with 9th digit)
    return limitedDigits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Function to format CEP
  const formatCep = (value: string) => {
    if (!value) return '';

    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Limit to 8 digits
    const limitedDigits = digits.slice(0, 8);

    // Format as 00000-000
    if (limitedDigits.length > 5) {
      return limitedDigits.replace(/(\d{5})(\d{1,3})/, '$1-$2');
    }

    return limitedDigits;
  };

  // Function to format CPF
  const formatCpf = (value: string) => {
    if (!value) return '';

    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Limit to 11 digits
    const limitedDigits = digits.slice(0, 11);

    // Format as 000.000.000-00
    if (limitedDigits.length <= 3) {
      return limitedDigits;
    }
    if (limitedDigits.length <= 6) {
      return limitedDigits.replace(/(\d{3})(\d+)/, '$1.$2');
    }
    if (limitedDigits.length <= 9) {
      return limitedDigits.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    }
    // 10 or 11 digits
    return limitedDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  };

  // Function to fetch address by CEP
  const fetchAddressByCep = async (cep: string) => {
    // Remove formatting from CEP
    const cleanCep = cep.replace(/\D/g, '');

    // Validate CEP format (8 digits)
    if (cleanCep.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos');
    }

    setIsLoadingCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      // Fill address fields
      form.setValue('street', data.logradouro || '');
      form.setValue('neighborhood', data.bairro || '');
      form.setValue('city', data.localidade || '');
      form.setValue('state', data.uf || '');

      // Clear any previous errors for these fields
      form.clearErrors(['street', 'neighborhood', 'city', 'state']);

    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro ao buscar CEP",
        description: error instanceof Error ? error.message : 'Erro ao buscar informações do CEP',
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  // Handle CEP change with auto-fill
  const handleCepChange = async (value: string) => {
    const formattedCep = formatCep(value);
    form.setValue('zipCode', formattedCep);

    // Auto-fill address when CEP is complete
    const cleanCep = value.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      await fetchAddressByCep(formattedCep);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : ''}`}>
        <PopupSystem trigger="page_specific" targetPage="profile" />
        <div className={`container mx-auto px-6 py-8 ${isMobile ? 'pt-32' : 'pt-20'}`}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/perfil')}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Meu Perfil Completo</h1>
              <p className="text-muted-foreground">Gerencie suas informações pessoais e de contato</p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Profile Image */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Foto de Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xl font-semibold border-4 border-white shadow-lg">
                        {getUserInitials(form.watch('name') || user.name || 'U')}
                      </div>
                    )}
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute -bottom-2 -right-2 rounded-full"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <p className="font-medium">Alterar foto de perfil</p>
                    <p className="text-sm text-muted-foreground">
                      Clique no ícone da câmera para escolher uma nova foto
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content - Side by Side Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side - Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="Seu nome completo"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  {/* CPF */}
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      {...form.register('cpf')}
                      placeholder="000.000.000-00"
                      value={form.watch('cpf')}
                      onChange={(e) => {
                        const formattedCpf = formatCpf(e.target.value);
                        form.setValue('cpf', formattedCpf);
                      }}
                    />
                    {form.formState.errors.cpf && (
                      <p className="text-sm text-destructive">{form.formState.errors.cpf.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                      placeholder="seu.email@exemplo.com"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  {/* Gender and Age */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gênero *</Label>
                      <Select 
                        value={form.watch("gender") || ""}
                        onValueChange={(value) => form.setValue("gender", value)}
                      >
                        <SelectTrigger id="gender" className="h-10">
                          <SelectValue placeholder="Selecione seu gênero" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                          <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.gender && form.formState.isSubmitted && (
                        <p className="text-sm text-destructive">{form.formState.errors.gender.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="age">Idade *</Label>
                      <Input
                        id="age"
                        type="number"
                        {...form.register('age')}
                        placeholder="25"
                        min="13"
                        max="120"
                      />
                      {form.formState.errors.age && (
                        <p className="text-sm text-destructive">{form.formState.errors.age.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={form.watch('phone') || ''}
                      onChange={(e) => {
                        const formattedValue = formatPhoneNumber(e.target.value);
                        form.setValue('phone', formattedValue);
                        form.trigger('phone');
                      }}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Right Side - Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ZIP Code */}
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP *</Label>
                    <div className="relative">
                      <Input
                        id="zipCode"
                        value={form.watch('zipCode') || ''}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                      {isLoadingCep && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {form.formState.errors.zipCode && form.formState.isSubmitted && (
                      <p className="text-sm text-destructive">{form.formState.errors.zipCode.message}</p>
                    )}
                  </div>

                  {/* Street */}
                  <div className="space-y-2">
                    <Label htmlFor="street">Rua *</Label>
                    <Input
                      id="street"
                      {...form.register('street')}
                      placeholder="Nome da rua"
                      disabled={isLoadingCep}
                    />
                    {form.formState.errors.street && form.formState.isSubmitted && (
                      <p className="text-sm text-destructive">{form.formState.errors.street.message}</p>
                    )}
                  </div>

                  {/* Number and Complement */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Número *</Label>
                      <Input
                        id="number"
                        {...form.register('number')}
                        placeholder="123"
                      />
                      {form.formState.errors.number && form.formState.isSubmitted && (
                        <p className="text-sm text-destructive">{form.formState.errors.number.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        {...form.register('complement')}
                        placeholder="Apto 45"
                      />
                    </div>
                  </div>

                  {/* Neighborhood */}
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      {...form.register('neighborhood')}
                      placeholder="Nome do bairro"
                      disabled={isLoadingCep}
                    />
                    {form.formState.errors.neighborhood && form.formState.isSubmitted && (
                      <p className="text-sm text-destructive">{form.formState.errors.neighborhood.message}</p>
                    )}
                  </div>

                  {/* City and State */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        {...form.register('city')}
                        placeholder="Nome da cidade"
                        disabled={isLoadingCep}
                      />
                      {form.formState.errors.city && form.formState.isSubmitted && (
                        <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        {...form.register('state')}
                        placeholder="SP"
                        disabled={isLoadingCep}
                      />
                      {form.formState.errors.state && form.formState.isSubmitted && (
                        <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Social Networks Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Redes Sociais
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSocialNetwork}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Rede Social
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma rede social adicionada</p>
                    <p className="text-sm">Clique em "Adicionar Rede Social" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg">
                        <div className="col-span-4 space-y-2">
                          <Label>Tipo de Rede Social</Label>
                          <Select
                            value={form.watch(`socialNetworks.${index}.type`) ?? "instagram"}
                            onValueChange={(value) =>
                              form.setValue(`socialNetworks.${index}.type`, value as any, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Selecione a rede social" />
                            </SelectTrigger>
                            <SelectContent>
                              {SOCIAL_NETWORK_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <span className="flex items-center gap-2">
                                    <span>{option.icon}</span>
                                    {option.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {form.formState.errors.socialNetworks?.[index]?.type && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.socialNetworks[index]?.type?.message}
                            </p>
                          )}
                        </div>

                        <div className="col-span-7 space-y-2">
                          <Label>
                            {form.watch(`socialNetworks.${index}.type`) === 'whatsapp' || 
                             form.watch(`socialNetworks.${index}.type`) === 'telegram' ? 
                             'Telefone' : 'URL do Perfil'}
                          </Label>
                          <Input
                            value={form.watch(`socialNetworks.${index}.url`) || ''}
                            onChange={(e) => {
                              const currentType = form.watch(`socialNetworks.${index}.type`);
                              if (currentType === 'whatsapp' || currentType === 'telegram') {
                                const formattedValue = formatPhoneNumber(e.target.value);
                                form.setValue(`socialNetworks.${index}.url`, formattedValue);
                              } else {
                                form.setValue(`socialNetworks.${index}.url`, e.target.value);
                              }
                              form.trigger(`socialNetworks.${index}.url`);
                            }}
                            placeholder={
                              form.watch(`socialNetworks.${index}.type`) === 'whatsapp' || 
                              form.watch(`socialNetworks.${index}.type`) === 'telegram' ? 
                              '(11) 99999-9999' : 'https://instagram.com/seu_perfil'
                            }
                            maxLength={
                              form.watch(`socialNetworks.${index}.type`) === 'whatsapp' || 
                              form.watch(`socialNetworks.${index}.type`) === 'telegram' ? 
                              15 : undefined
                            }
                            className="h-10"
                          />
                          {form.formState.errors.socialNetworks?.[index]?.url && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.socialNetworks[index]?.url?.message}
                            </p>
                          )}
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <div className="mt-8">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeSocialNetwork(index)}
                              className="text-destructive hover:text-destructive h-10 w-10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/perfil')}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Perfil
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}