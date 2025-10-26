import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Users, Edit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminUsersMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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

      <div className="pt-20 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-3">
            {users.map((userData) => (
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
                        variant={userData.planType === 'premium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {userData.planType === 'premium' ? 'Premium' : 'Free'}
                      </Badge>
                      {userData.isAdmin && (
                        <Badge variant="outline" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-edit-${userData.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
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
