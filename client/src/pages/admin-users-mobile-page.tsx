import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Users, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataSync } from '@/hooks/use-data-sync';
import { User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";

export default function AdminUsersMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useDataSync();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const handleBackClick = () => {
    setLocation('/admin');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted"
            onClick={handleBackClick}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">
              {users?.length || 0} usuários cadastrados
            </p>
          </div>
          <Users className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-24 px-4 pb-4">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-3">
            {users
              .filter(userData => 
                userData.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                userData.email.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((userData) => (
              <div
                key={userData.id}
                className="bg-card rounded-xl border border-border p-4"
                data-testid={`card-user-${userData.id}`}
              >
                <div className="flex gap-3 items-center">
                  <Avatar className="w-12 h-12">
                    <AvatarImage 
                      src={userData.avatar} 
                      alt={userData.name}
                    />
                    <AvatarFallback>
                      {userData.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {userData.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {userData.email}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge 
                        className={userData.planType === 'premium' 
                          ? 'bg-purple-100 text-purple-700 text-xs' 
                          : 'bg-blue-100 text-blue-700 text-xs'}
                      >
                        {userData.planType === 'premium' ? 'Premium' : 'Free'}
                      </Badge>
                      {userData.isAdmin && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}