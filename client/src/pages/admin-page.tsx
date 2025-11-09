import Sidebar from "@/components/sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Video, Product, Coupon, Banner, Popup, User, Notification, Category,
  insertVideoSchema, insertProductSchema, insertCouponSchema, insertBannerSchema, insertPopupSchema, insertNotificationSchema, insertCategorySchema
} from "@shared/schema";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Edit2, Trash2, Play, Download, Tag, Image, BarChart3, Eye, Users, Search, Filter, ChevronLeft, ChevronRight, Bell, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdmin } from "@/contexts/admin-context";
import { useEffect } from "react";
import { ImageUpload } from "@/components/ui/image-upload";
import { ResourceSearchSelect } from "@/components/resource-search-select";

const createVideoSchema = insertVideoSchema;
const createProductSchema = insertProductSchema;
const createCouponSchema = insertCouponSchema;
const createBannerSchema = insertBannerSchema;
const createPopupSchema = insertPopupSchema;
const createNotificationSchema = insertNotificationSchema;
const createCategorySchema = insertCategorySchema;

// Translation functions
const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'makeup':
      return 'Maquiagem';
    case 'skincare':
      return 'Skincare';
    case 'hair':
      return 'Cabelos';
    case 'nails':
      return 'Unhas';
    case 'perfume':
      return 'Perfumes';
    default:
      return category;
  }
};

const getProductTypeLabel = (type: string) => {
  switch (type) {
    case 'ebook':
      return 'E-book';
    case 'course':
      return 'Curso';
    case 'course_video':
      return 'Curso - Vídeo Único';
    case 'course_playlist':
      return 'Curso - Playlist';
    case 'pdf':
      return 'PDF';
    case 'checklist':
      return 'Checklist';
    default:
      return type;
  }
};

const getVideoTypeLabel = (type: string) => {
  switch (type) {
    case 'video':
      return 'Vídeo';
    case 'playlist':
      return 'Playlist';
    case 'live':
      return 'Live';
    default:
      return 'Vídeo';
  }
};

export default function AdminPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAdminMode, viewMode, setAdminMode, setViewMode } = useAdmin();
  const [location, setLocation] = useLocation();

  // Extrair a aba da URL
  const getTabFromUrl = () => {
    const path = location.replace('/admin/', '').replace('/admin', '');
    const validTabs = ['videos', 'products', 'coupons', 'banners', 'popups', 'notifications', 'categories', 'users'];
    return validTabs.includes(path) ? path : 'videos';
  };

  const [activeTab, setActiveTab] = useState(getTabFromUrl());
  const [editingItem, setEditingItem] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: string, title?: string} | null>(null);

  // Estados para controle de conflito de ordem de cupons
  const [showCouponConflictDialog, setShowCouponConflictDialog] = useState(false);
  const [couponConflictData, setCouponConflictData] = useState<{ order: number; conflictCoupon?: Coupon } | null>(null);
  const [pendingCouponData, setPendingCouponData] = useState<z.infer<typeof createCouponSchema> | null>(null);

  // Estados para controle de conflito de ordem de categorias
  const [showCategoryConflictDialog, setShowCategoryConflictDialog] = useState(false);
  const [pendingCategoryData, setPendingCategoryData] = useState<z.infer<typeof createCategorySchema> | null>(null);
  const [conflictingCategory, setConflictingCategory] = useState<Category | null>(null);
  const [originalCategoryOrder, setOriginalCategoryOrder] = useState<number | null>(null);

  // Estados para controle de conflito de ordem de banners
  const [showBannerConflictDialog, setShowBannerConflictDialog] = useState(false);
  const [pendingBannerData, setPendingBannerData] = useState<z.infer<typeof createBannerSchema> | null>(null);
  const [conflictingBanner, setConflictingBanner] = useState<Banner | null>(null);
  const [originalBannerOrder, setOriginalBannerOrder] = useState<number | null>(null);
  const [originalBannerPage, setOriginalBannerPage] = useState<string | null>(null);
  const [originalBannerVideoId, setOriginalBannerVideoId] = useState<string | null>(null);
  const [originalBannerCourseId, setOriginalBannerCourseId] = useState<string | null>(null); // Adicionado para curso específico

  // Atualizar URL quando a aba mudar
  useEffect(() => {
    const newPath = `/admin/${activeTab}`;
    if (location !== newPath) {
      setLocation(newPath);
    }
  }, [activeTab]);

  // Atualizar aba quando a URL mudar
  useEffect(() => {
    const tabFromUrl = getTabFromUrl();
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location]);



  // Estados para filtros e paginação dos usuários
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userGenderFilter, setUserGenderFilter] = useState("all");
  const [userPlanFilter, setUserPlanFilter] = useState("all");
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userItemsPerPage, setUserItemsPerPage] = useState(10);

  // Estados para outras abas
  const [videoSearchTerm, setVideoSearchTerm] = useState("");
  const [videoCurrentPage, setVideoCurrentPage] = useState(1);
  const [videoItemsPerPage, setVideoItemsPerPage] = useState(10);

  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [productItemsPerPage, setProductItemsPerPage] = useState(10);

  const [couponSearchTerm, setCouponSearchTerm] = useState("");
  const [couponCurrentPage, setCouponCurrentPage] = useState(1);
  const [couponItemsPerPage, setCouponItemsPerPage] = useState(10);

  const [bannerSearchTerm, setBannerSearchTerm] = useState("");
  const [bannerCurrentPage, setBannerCurrentPage] = useState(1);
  const [bannerItemsPerPage, setBannerItemsPerPage] = useState(10);

  const [popupSearchTerm, setPopupSearchTerm] = useState("");
  const [popupCurrentPage, setPopupCurrentPage] = useState(1);
  const [popupItemsPerPage, setPopupItemsPerPage] = useState(10);

  const [notificationSearchTerm, setNotificationSearchTerm] = useState("");
  const [notificationCurrentPage, setNotificationCurrentPage] = useState(1);
  const [notificationItemsPerPage, setNotificationItemsPerPage] = useState(10);

  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1);
  const [categoryItemsPerPage, setCategoryItemsPerPage] = useState(10);

  // Estado para controlar se algum item está sendo deletado
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Estado para controlar se algum item está sendo criado
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  // Ativar modo admin quando entrar na página
  useEffect(() => {
    setAdminMode(true);

    // Limpar modo admin quando sair da página
    return () => {
      setAdminMode(false);
    };
  }, [setAdminMode]);

  // Redirect non-admin users
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: videos, isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: coupons, isLoading: couponsLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const { data: bannersData, isLoading: bannersLoading } = useQuery<Banner[]>({
    queryKey: ["/api/admin/banners"],
  });

  // Agrupar banners por página e vídeo específico, depois ordenar por posição dentro de cada grupo
  const banners = bannersData?.sort((a, b) => {
    // Primeiro critério: ordenar por página
    if (a.page !== b.page) {
      const pageOrder = ['home', 'videos', 'products', 'coupons', 'community', 'profile', 'bio', 'video_specific', 'course_specific']; // Adicionado 'course_specific'
      const pageIndexA = pageOrder.indexOf(a.page) !== -1 ? pageOrder.indexOf(a.page) : 999;
      const pageIndexB = pageOrder.indexOf(b.page) !== -1 ? pageOrder.indexOf(b.page) : 999;
      return pageIndexA - pageIndexB;
    }

    // Para vídeos específicos, agrupar por videoId
    if (a.page === 'video_specific' && b.page === 'video_specific') {
      const videoIdA = a.videoId || '';
      const videoIdB = b.videoId || '';
      if (videoIdA !== videoIdB) {
        return videoIdA.localeCompare(videoIdB);
      }
    }

    // Para cursos específicos, agrupar por courseId
    if (a.page === 'course_specific' && b.page === 'course_specific') {
      const courseIdA = a.courseId || ''; // Adicionado
      const courseIdB = b.courseId || ''; // Adicionado
      if (courseIdA !== courseIdB) {
        return courseIdA.localeCompare(courseIdB);
      }
    }

    // Segundo critério: ordenar por posição (order) dentro do mesmo grupo
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Terceiro critério: por data de criação
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const { data: popups, isLoading: popupsLoading } = useQuery<Popup[]>({
    queryKey: ["/api/admin/popups"],
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/admin/notifications"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Estado de loading geral - verifica se TODOS os dados dos 8 cards estão carregando
  const isMainDataLoading = videosLoading || productsLoading || couponsLoading || bannersLoading || 
                           popupsLoading || notificationsLoading || categoriesLoading || usersLoading;

  // Função para verificar conflito de ordem de cupons
  const checkCouponOrderConflict = async (order: number): Promise<{ hasConflict: boolean; conflict?: Coupon }> => {
    try {
      const url = editingItem 
        ? `/api/coupons/check-order/${order}?excludeId=${editingItem.id}`
        : `/api/coupons/check-order/${order}`;
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erro ao verificar conflito');
      return await response.json();
    } catch (error) {
      return { hasConflict: false };
    }
  };

  // Lógica de filtro e paginação para usuários
  const filteredAndPaginatedUsers = useMemo(() => {
    if (!usersData) return { users: [], totalPages: 0, totalUsers: 0 };

    // Aplicar filtros
    let filtered = usersData.filter((user) => {
      // Filtro por termo de pesquisa
      const matchesSearch = 
        user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase());

      // Filtro por gênero
      const matchesGender = 
        userGenderFilter === "all" || 
        user.gender === userGenderFilter;

      // Filtro por plano
      const matchesPlan = 
        userPlanFilter === "all" || 
        (user.planType || 'free') === userPlanFilter;

      return matchesSearch && matchesGender && matchesPlan;
    });

    const totalUsers = filtered.length;
    const totalPages = Math.ceil(totalUsers / userItemsPerPage);

    // Aplicar paginação
    const startIndex = (userCurrentPage - 1) * userItemsPerPage;
    const endIndex = startIndex + userItemsPerPage;
    const paginatedUsers = filtered.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      totalPages,
      totalUsers
    };
  }, [usersData, userSearchTerm, userGenderFilter, userPlanFilter, userCurrentPage, userItemsPerPage]);

  // Lógicas de filtro e paginação para outras abas
  const filteredAndPaginatedVideos = useMemo(() => {
    if (!videos) return { items: [], totalPages: 0, totalItems: 0 };

    // Mostrar todos os vídeos na área administrativa
    let filtered = videos.filter((video) => 
      video.title.toLowerCase().includes(videoSearchTerm.toLowerCase()) ||
      (video.description && video.description.toLowerCase().includes(videoSearchTerm.toLowerCase()))
    );

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / videoItemsPerPage);
    const startIndex = (videoCurrentPage - 1) * videoItemsPerPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + videoItemsPerPage);

    return { items: paginatedItems, totalPages, totalItems };
  }, [videos, videoSearchTerm, videoCurrentPage, videoItemsPerPage]);

  const filteredAndPaginatedProducts = useMemo(() => {
    if (!products) return { items: [], totalPages: 0, totalItems: 0 };

    // Mostrar todos os produtos (ativos e inativos) na área administrativa
    let filtered = products.filter((product) => 
      product.title.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(productSearchTerm.toLowerCase()))
    );

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / productItemsPerPage);
    const startIndex = (productCurrentPage - 1) * productItemsPerPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + productItemsPerPage);

    return { items: paginatedItems, totalPages, totalItems };
  }, [products, productSearchTerm, productCurrentPage, productItemsPerPage]);

  const filteredAndPaginatedCoupons = useMemo(() => {
    if (!coupons) return { items: [], totalPages: 0, totalItems: 0 };

    // Mostrar todos os cupons (ativos e inativos) na área administrativa
    let filtered = coupons.filter((coupon) => 
      coupon.code.toLowerCase().includes(couponSearchTerm.toLowerCase()) ||
      (coupon.description && coupon.description.toLowerCase().includes(couponSearchTerm.toLowerCase())) ||
      coupon.brand.toLowerCase().includes(couponSearchTerm.toLowerCase())
    );

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / couponItemsPerPage);
    const startIndex = (couponCurrentPage - 1) * couponItemsPerPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + couponItemsPerPage);

    return { items: paginatedItems, totalPages, totalItems };
  }, [coupons, couponSearchTerm, couponCurrentPage, couponItemsPerPage]);

  const filteredAndPaginatedBanners = useMemo(() => {
    if (!banners) return { items: [], totalPages: 0, totalItems: 0 };

    let filtered = banners.filter((banner) => 
      banner.title.toLowerCase().includes(bannerSearchTerm.toLowerCase()) ||
      (banner.description && banner.description.toLowerCase().includes(bannerSearchTerm.toLowerCase()))
    );

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / bannerItemsPerPage);
    const startIndex = (bannerCurrentPage - 1) * bannerItemsPerPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + bannerItemsPerPage);

    return { items: paginatedItems, totalPages, totalItems };
  }, [banners, bannerSearchTerm, bannerCurrentPage, bannerItemsPerPage]);

  const filteredAndPaginatedPopups = useMemo(() => {
    if (!popups) return { items: [], totalPages: 0, totalItems: 0 };

    let filtered = popups.filter((popup) => 
      popup.title.toLowerCase().includes(popupSearchTerm.toLowerCase()) ||
      (popup.description && popup.description.toLowerCase().includes(popupSearchTerm.toLowerCase()))
    );

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / popupItemsPerPage);
    const startIndex = (popupCurrentPage - 1) * popupItemsPerPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + popupItemsPerPage);

    return { items: paginatedItems, totalPages, totalItems };
  }, [popups, popupSearchTerm, popupCurrentPage, popupItemsPerPage]);

  const filteredAndPaginatedNotifications = useMemo(() => {
    if (!notifications) return { items: [], totalPages: 0, totalItems: 0 };

    let filtered = notifications.filter((notification) => 
      notification.title.toLowerCase().includes(notificationSearchTerm.toLowerCase()) ||
      (notification.description && notification.description.toLowerCase().includes(notificationSearchTerm.toLowerCase()))
    );

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / notificationItemsPerPage);
    const startIndex = (notificationCurrentPage - 1) * notificationItemsPerPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + notificationItemsPerPage);

    return { items: paginatedItems, totalPages, totalItems };
  }, [notifications, notificationSearchTerm, notificationCurrentPage, notificationItemsPerPage]);

  const filteredAndPaginatedCategories = useMemo(() => {
    if (!categories) return { items: [], totalPages: 0, totalItems: 0 };

    let filtered = categories.filter((category) => 
      category.title.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(categorySearchTerm.toLowerCase()))
    );

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / categoryItemsPerPage);
    const startIndex = (categoryCurrentPage - 1) * categoryItemsPerPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + categoryItemsPerPage);

    return { items: paginatedItems, totalPages, totalItems };
  }, [categories, categorySearchTerm, categoryCurrentPage, categoryItemsPerPage]);

  // Resetar páginas quando filtros mudarem
  useEffect(() => {
    setUserCurrentPage(1);
  }, [userSearchTerm, userGenderFilter, userPlanFilter, userItemsPerPage]);

  useEffect(() => {
    setVideoCurrentPage(1);
  }, [videoSearchTerm, videoItemsPerPage]);

  useEffect(() => {
    setProductCurrentPage(1);
  }, [productSearchTerm, productItemsPerPage]);

  useEffect(() => {
    setCouponCurrentPage(1);
  }, [couponSearchTerm, couponItemsPerPage]);

  useEffect(() => {
    setBannerCurrentPage(1);
  }, [bannerSearchTerm, bannerItemsPerPage]);

  useEffect(() => {
    setPopupCurrentPage(1);
  }, [popupSearchTerm, popupItemsPerPage]);

  useEffect(() => {
    setNotificationCurrentPage(1);
  }, [notificationSearchTerm, notificationItemsPerPage]);

  useEffect(() => {
    setCategoryCurrentPage(1);
  }, [categorySearchTerm, categoryItemsPerPage]);

  // Video form
  const videoForm = useForm<z.infer<typeof createVideoSchema>>({
    resolver: zodResolver(createVideoSchema),
    defaultValues: {
      title: "",
      description: "",
      videoUrl: "",
      type: "video",
      thumbnailUrl: "",
      isExclusive: false,
      categoryId: "",
      duration: "",
    },
  });

  // Product form
  const productForm = useForm<z.infer<typeof createProductSchema>>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "ebook",
      fileUrl: "",
      coverImageUrl: "",
      categoryId: "",
      isExclusive: false,
      isActive: true,
    },
  });

  // Coupon form
  const couponForm = useForm<z.infer<typeof createCouponSchema>>({
    resolver: zodResolver(createCouponSchema),
    defaultValues: {
      code: "",
      brand: "",
      description: "",
      discount: "",
      categoryId: "",
      isExclusive: false,
      isActive: true,
      storeUrl: "",
      coverImageUrl: "",
      order: 0,
      startDateTime: "",
      endDateTime: "",
    },
  });

  // Banner form
  const bannerForm = useForm<z.infer<typeof createBannerSchema>>({
    resolver: zodResolver(createBannerSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      page: "home",
      isActive: true,
      order: 0,
      showTitle: true,
      showDescription: true,
      showButton: true,
      opensCouponsModal: false,
      startDateTime: "",
      endDateTime: "",
      videoId: null, // Certificar que videoId é opcional
      courseId: null, // Adicionar courseId como opcional
      displayOn: 'both', // Default to 'both'
    },
  });

  // Popup form
  const popupForm = useForm<z.infer<typeof createPopupSchema>>({
    resolver: zodResolver(createPopupSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      trigger: "login",
      targetPage: "",
      targetVideoId: "",
      targetCourseId: "", // Adicionar targetCourseId
      showFrequency: "always",
      showTitle: false,
      showDescription: false,
      showButton: false,
      isExclusive: false,
      isActive: true,
      startDateTime: "",
      endDateTime: "",
    },
  });

  // Notification form
  const notificationForm = useForm<z.infer<typeof createNotificationSchema>>({
    resolver: zodResolver(createNotificationSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      targetAudience: "all",
      isActive: true,
      startDateTime: "",
      endDateTime: "",
    },
  });

  // Category form
  const categoryForm = useForm<z.infer<typeof createCategorySchema>>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      title: "",
      description: "",
      coverImageUrl: "",
      isActive: true,
      order: 0,
    },
  });

  // Auto-preencher ordem de categoria ao criar
  useEffect(() => {
    if (editingItem && activeTab === 'categories') {
      const orderValue = editingItem.order || 0;
      setOriginalCategoryOrder(orderValue);
    } else if (!editingItem && categories && activeTab === 'categories' && dialogOpen) {
      const maxOrder = categories.reduce((max, cat) => Math.max(max, cat.order || 0), 0);
      categoryForm.setValue("order", maxOrder + 1);
    }
  }, [editingItem, categories, activeTab, dialogOpen, categoryForm]);

  // Armazenar valores originais ao editar banner
  useEffect(() => {
    if (editingItem && activeTab === 'banners') {
      const orderValue = editingItem.order || 0;
      setOriginalBannerOrder(orderValue);
      setOriginalBannerPage(editingItem.page);
      setOriginalBannerVideoId(editingItem.videoId || null);
      setOriginalBannerCourseId(editingItem.courseId || null); // Adicionado
    }
  }, [editingItem, activeTab]);

  // Watch page and videoId changes para auto-preencher ordem de banner ao criar
  useEffect(() => {
    if (!editingItem && banners && activeTab === 'banners' && dialogOpen) {
      const currentPage = bannerForm.watch("page") || "home";
      const currentVideoId = bannerForm.watch("videoId") || "";
      const currentCourseId = bannerForm.watch("courseId") || ""; // Adicionado

      const filteredBanners = banners.filter(b => {
        if (b.page !== currentPage) return false;
        if (currentPage === 'video_specific' && b.videoId !== currentVideoId) return false;
        if (currentPage === 'course_specific' && b.courseId !== currentCourseId) return false; // Adicionado
        return true;
      });

      const maxOrder = filteredBanners.length > 0 
        ? filteredBanners.reduce((max, b) => Math.max(max, b.order || 0), 0) + 1
        : 0;
      bannerForm.setValue("order", maxOrder);
    }

    const subscription = bannerForm.watch((value, { name }) => {
      // Só atualizar ordem se mudou page, videoId ou courseId, não se mudou order (evita loop infinito)
      if (!editingItem && banners && activeTab === 'banners' && dialogOpen && (name === 'page' || name === 'videoId' || name === 'courseId')) { // Adicionado 'courseId'
        const currentPage = value.page || "home";
        const currentVideoId = value.videoId || "";
        const currentCourseId = value.courseId || ""; // Adicionado

        const filteredBanners = banners.filter(b => {
          if (b.page !== currentPage) return false;
          if (currentPage === 'video_specific' && b.videoId !== currentVideoId) return false;
          if (currentPage === 'course_specific' && b.courseId !== currentCourseId) return false; // Adicionado
          return true;
        });

        const maxOrder = filteredBanners.length > 0 
          ? filteredBanners.reduce((max, b) => Math.max(max, b.order || 0), 0) + 1
          : 0;
        bannerForm.setValue("order", maxOrder);
      }
    });
    return () => subscription.unsubscribe();
  }, [bannerForm, editingItem, banners, activeTab, dialogOpen]);

  // Mutations
  const createVideoMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createVideoSchema>) => {
      if (!editingItem) {
        setIsCreatingItem(true);
      }
      const response = await apiRequest(editingItem ? "PUT" : "POST",
        editingItem ? `/api/videos/${editingItem.id}` : "/api/videos", data);
      return response.json();
    },
    onSuccess: async () => {
      // Invalidar todas as queries relacionadas a vídeos para atualizar o cache instantaneamente
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["video"] });

      // Aguardar o refetch ser completado ANTES de fechar a tela
      await queryClient.refetchQueries({ queryKey: ["/api/videos"] });

      // Só fechar a tela DEPOIS que os dados foram atualizados
      videoForm.reset();
      setDialogOpen(false);
      setEditingItem(null);
      toast({
        title: "Sucesso",
        description: editingItem ? "Vídeo atualizado!" : "Vídeo criado!",
      });

      setIsCreatingItem(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar vídeo",
        variant: "destructive",
      });
      setIsCreatingItem(false);
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createProductSchema>) => {
      if (!editingItem) {
        setIsCreatingItem(true);
      }
      const response = await apiRequest(editingItem ? "PUT" : "POST",
        editingItem ? `/api/products/${editingItem.id}` : "/api/products", data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

      await queryClient.refetchQueries({ queryKey: ["/api/products"] });

      productForm.reset();
      setDialogOpen(false);
      setEditingItem(null);
      toast({
        title: "Sucesso",
        description: editingItem ? "Produto atualizado!" : "Produto criado!",
      });

      setIsCreatingItem(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar produto",
        variant: "destructive",
      });
      setIsCreatingItem(false);
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createCouponSchema> & { shouldReorder?: boolean }) => {
      if (!editingItem) {
        setIsCreatingItem(true);
      }
      const response = await apiRequest(editingItem ? "PUT" : "POST",
        editingItem ? `/api/coupons/${editingItem.id}` : "/api/coupons", data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });

      await queryClient.refetchQueries({ queryKey: ["/api/coupons"] });

      couponForm.reset();
      setDialogOpen(false);
      setEditingItem(null);
      setPendingCouponData(null);
      setCouponConflictData(null);
      toast({
        title: "Sucesso",
        description: editingItem ? "Cupom atualizado!" : "Cupom criado!",
      });

      setIsCreatingItem(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Falha ao salvar cupom: ${error.message}`,
        variant: "destructive",
      });
      setIsCreatingItem(false);
    },
  });

  const createBannerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createBannerSchema>) => {
      // Garantir que campos vazios sejam null e limpar conforme a página selecionada
      const cleanedData = {
        ...data,
        videoId: data.page === 'video_specific' && data.videoId ? data.videoId : null,
        courseId: data.page === 'course_specific' && data.courseId ? data.courseId : null,
        startDateTime: data.startDateTime || null,
        endDateTime: data.endDateTime || null,
      };

      console.log('[createBannerMutation] Página selecionada:', data.page);
      console.log('[createBannerMutation] Iniciando mutation com data:', cleanedData);
      console.log('[createBannerMutation] editingItem:', editingItem);

      if (!editingItem) {
        setIsCreatingItem(true);
      }

      try {
        let response;
        if (editingItem) {
          console.log('[createBannerMutation] Atualizando banner ID:', editingItem.id);
          response = await apiRequest('PUT', `/api/banners/${editingItem.id}`, cleanedData);
        } else {
          console.log('[createBannerMutation] Criando novo banner');
          response = await apiRequest('POST', '/api/banners', cleanedData);
        }
        console.log('[createBannerMutation] Resposta recebida:', response);
        return response;
      } catch (error) {
        console.error('[createBannerMutation] Erro no mutationFn:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log('[createBannerMutation] onSuccess chamado com data:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      if (editingItem) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/banners/${editingItem.id}`] });
      }

      await queryClient.refetchQueries({ queryKey: ["/api/admin/banners"] });

      toast({
        title: "Sucesso",
        description: editingItem ? "Banner atualizado!" : "Banner criado!",
      });
      console.log('[createBannerMutation] Resetando formulário e fechando dialog');
      bannerForm.reset();
      setDialogOpen(false);
      setEditingItem(null);
      setPendingBannerData(null);
      setConflictingBanner(null);
      setOriginalBannerOrder(null);
      setOriginalBannerPage(null);
      setOriginalBannerVideoId(null);
      setOriginalBannerCourseId(null); // Resetar também
      console.log('[createBannerMutation] onSuccess concluído');

      setIsCreatingItem(false);
    },
    onError: (error: any) => {
      console.error('[createBannerMutation] onError chamado com erro:', error);
      console.error('[createBannerMutation] Tipo do erro:', typeof error);
      console.error('[createBannerMutation] Stack do erro:', error?.stack);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao salvar banner",
        variant: "destructive",
      });
      setIsCreatingItem(false);
    },
  });

  const reorganizeBannerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createBannerSchema>) => {
      // Garantir que campos vazios sejam null e limpar conforme a página
      const cleanedData = {
        ...data,
        videoId: data.page === 'video_specific' && data.videoId ? data.videoId : null,
        courseId: data.page === 'course_specific' && data.courseId ? data.courseId : null,
        startDateTime: data.startDateTime || null,
        endDateTime: data.endDateTime || null,
      };

      console.log('[reorganizeBannerMutation] Página:', data.page);
      console.log('[reorganizeBannerMutation] Iniciando reorganização com data:', cleanedData);

      if (!editingItem) {
        setIsCreatingItem(true);
      }

      if (!banners) {
        console.log('[reorganizeBannerMutation] Sem banners disponíveis');
        return;
      }

      const bannerId = editingItem?.id; // ID do banner que está sendo editado/criado
      const newOrder = cleanedData.order || 0;
      const oldOrder = originalBannerOrder ?? -1;
      const currentPage = cleanedData.page;
      const currentVideoId = cleanedData.videoId || null;
      const currentCourseId = cleanedData.courseId || null;

      console.log('[reorganizeBannerMutation] newOrder:', newOrder, 'oldOrder:', oldOrder);
      console.log('[reorganizeBannerMutation] currentPage:', currentPage, 'currentVideoId:', currentVideoId, 'currentCourseId:', currentCourseId);

      const updates: Promise<any>[] = [];

      // Lógica para empurrar outros banners
      banners.forEach(b => {
        // Ignorar o próprio banner que está sendo editado/criado
        if (b.id === bannerId) return;

        // Verificar se o banner pertence ao mesmo contexto (página, vídeo ou curso)
        if (b.page !== currentPage) return;
        if (currentPage === 'video_specific' && b.videoId !== currentVideoId) return;
        if (currentPage === 'course_specific' && b.courseId !== currentCourseId) return; // Adicionado

        // Lógica de reordenação
        if (editingItem) { // Modo edição
          if (newOrder < oldOrder) { // Movendo para cima
            if (b.order !== null && b.order !== undefined && b.order >= newOrder && b.order < oldOrder) {
              console.log(`Empurrando para baixo banner ${b.id}: ${b.order} -> ${b.order + 1}`);
              updates.push(
                apiRequest('PUT', `/api/banners/${b.id}`, {
                  ...b,
                  order: b.order + 1,
                })
              );
            }
          } else if (newOrder > oldOrder) { // Movendo para baixo
            if (b.order !== null && b.order !== undefined && b.order > oldOrder && b.order <= newOrder) {
              console.log(`Empurrando para cima banner ${b.id}: ${b.order} -> ${b.order - 1}`);
              updates.push(
                apiRequest('PUT', `/api/banners/${b.id}`, {
                  ...b,
                  order: b.order - 1,
                })
              );
            }
          }
        } else { // Modo criação
          // Empurrar para baixo todos os banners que estão na mesma posição ou posterior
          if (b.order !== null && b.order !== undefined && b.order >= newOrder) {
            console.log(`Empurrando para baixo banner ${b.id} (criação): ${b.order} -> ${b.order + 1}`);
            updates.push(
              apiRequest('PUT', `/api/banners/${b.id}`, {
                ...b,
                order: b.order + 1,
              })
            );
          }
        }
      });

      console.log('[reorganizeBannerMutation] Total de atualizações de outros banners:', updates.length);
      await Promise.all(updates);
      console.log('[reorganizeBannerMutation] Todas as atualizações de outros banners concluídas');

      try {
        let response;
        if (editingItem) {
          console.log('[reorganizeBannerMutation] Salvando banner editado com nova ordem:', cleanedData.order);
          response = await apiRequest('PUT', `/api/banners/${editingItem.id}`, cleanedData);
        } else {
          console.log('[reorganizeBannerMutation] Salvando novo banner com nova ordem:', cleanedData.order);
          response = await apiRequest('POST', '/api/banners', cleanedData);
        }
        console.log('[reorganizeBannerMutation] Banner salvo com sucesso:', response);
        return response;
      } catch (error) {
        console.error('[reorganizeBannerMutation] Erro ao salvar banner:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log('[reorganizeBannerMutation] onSuccess chamado com data:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      if (editingItem) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/banners/${editingItem.id}`] });
      }

      await queryClient.refetchQueries({ queryKey: ["/api/admin/banners"] });

      toast({
        title: "Sucesso",
        description: editingItem ? "Banner atualizado e banners reorganizados!" : "Banner criado e banners reorganizados!",
      });
      console.log('[reorganizeBannerMutation] Resetando formulário e fechando dialog');
      bannerForm.reset();
      setShowBannerConflictDialog(false);
      setPendingBannerData(null);
      setConflictingBanner(null);
      setDialogOpen(false);
      setEditingItem(null);
      setOriginalBannerOrder(null);
      setOriginalBannerPage(null);
      setOriginalBannerVideoId(null);
      setOriginalBannerCourseId(null); // Resetar também
      console.log('[reorganizeBannerMutation] onSuccess concluído');

      setIsCreatingItem(false);
    },
    onError: (error: any) => {
      console.error('[reorganizeBannerMutation] onError chamado com erro:', error);
      console.error('[reorganizeBannerMutation] Tipo do erro:', typeof error);
      console.error('[reorganizeBannerMutation] Stack do erro:', error?.stack);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao reorganizar banners",
        variant: "destructive",
      });
      setShowBannerConflictDialog(false);
      setIsCreatingItem(false);
    },
  });

  const createPopupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createPopupSchema>) => {
      if (!editingItem) {
        setIsCreatingItem(true);
      }
      const response = await apiRequest(editingItem ? "PUT" : "POST",
        editingItem ? `/api/popups/${editingItem.id}` : "/api/popups", data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/popups"] });
      // Invalidar cache do sistema de popups em todas as páginas
      queryClient.invalidateQueries({ queryKey: ["/api/popups"] });

      // Limpar cache do sessionStorage para popups
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('popup_') && key.endsWith('_seen')) {
          sessionStorage.removeItem(key);
        }
      });

      await queryClient.refetchQueries({ queryKey: ["/api/admin/popups"] });

      popupForm.reset();
      setDialogOpen(false);
      setEditingItem(null);
      toast({
        title: "Sucesso",
        description: editingItem ? "Popup atualizado!" : "Popup criado!",
      });

      setIsCreatingItem(false);
    },
    onError: (error: any) => {
      console.log('Erro completo capturado:', error);
      let errorMessage = "Falha ao salvar popup";

      // Verificar o erro completo (mensagem e response)
      const errorString = JSON.stringify(error);
      const errorMsg = (error?.message || '').toLowerCase();
      const errorResponse = JSON.stringify(error?.response || {}).toLowerCase();

      console.log('Verificando erro:', {
        errorMsg,
        errorResponse,
        errorString: errorString.toLowerCase()
      });

      // Verificar se é erro de foreign key
      const isForeignKeyError = 
        errorMsg.includes('foreign') || 
        errorMsg.includes('constraint') || 
        errorMsg.includes('not present') ||
        errorMsg.includes('violates') ||
        errorResponse.includes('foreign') ||
        errorResponse.includes('constraint') ||
        errorResponse.includes('not present') ||
        errorString.toLowerCase().includes('foreign') ||
        errorString.toLowerCase().includes('video_id') ||
        errorString.toLowerCase().includes('course_id');

      if (isForeignKeyError) {
        if (popupForm.watch("targetPage") === "video_specific") {
          errorMessage = "Vídeo não encontrado. Verifique o ID adicionado.";
        } else if (popupForm.watch("targetPage") === "course_specific") {
          errorMessage = "Curso não encontrado. Verifique o ID adicionado.";
        }
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      setIsCreatingItem(false);
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createNotificationSchema>) => {
      if (!editingItem) {
        setIsCreatingItem(true);
      }
      const response = await apiRequest(editingItem ? "PUT" : "POST",
        editingItem ? `/api/admin/notifications/${editingItem.id}` : "/api/admin/notifications", data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });

      await queryClient.refetchQueries({ queryKey: ["/api/admin/notifications"] });

      notificationForm.reset();
      setDialogOpen(false);
      setEditingItem(null);
      toast({
        title: "Sucesso",
        description: editingItem ? "Notificação atualizada!" : "Notificação criada!",
      });

      setIsCreatingItem(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar notificação",
        variant: "destructive",
      });
      setIsCreatingItem(false);
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("POST", `/api/admin/notifications/${notificationId}/send`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Notificação enviada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao enviar notificação",
        variant: "destructive",
      });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createCategorySchema>) => {
      if (!editingItem) {
        setIsCreatingItem(true);
      }
      const response = await apiRequest(editingItem ? "PUT" : "POST",
        editingItem ? `/api/categories/${editingItem.id}` : "/api/categories", data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });

      await queryClient.refetchQueries({ queryKey: ["/api/categories"] });

      categoryForm.reset();
      setDialogOpen(false);
      setEditingItem(null);
      setPendingCategoryData(null);
      setConflictingCategory(null);
      toast({
        title: "Sucesso",
        description: editingItem ? "Categoria atualizada!" : "Categoria criada!",
      });

      setIsCreatingItem(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar categoria",
        variant: "destructive",
      });
      setIsCreatingItem(false);
    },
  });

  const reorganizeCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createCategorySchema>) => {
      if (!editingItem) {
        setIsCreatingItem(true);
      }

      if (!categories) return;

      const newOrder = data.order || 0;
      const oldOrder = originalCategoryOrder ?? -1;

      const updates: Promise<any>[] = [];

      if (editingItem) {
        if (newOrder < oldOrder) {
          categories.forEach(cat => {
            if (cat.id !== editingItem.id && cat.order !== null && cat.order !== undefined) {
              if (cat.order >= newOrder && cat.order < oldOrder) {
                updates.push(
                  apiRequest('PUT', `/api/categories/${cat.id}`, {
                    ...cat,
                    order: cat.order + 1,
                  })
                );
              }
            }
          });
        } else if (newOrder > oldOrder) {
          categories.forEach(cat => {
            if (cat.id !== editingItem.id && cat.order !== null && cat.order !== undefined) {
              if (cat.order > oldOrder && cat.order <= newOrder) {
                updates.push(
                  apiRequest('PUT', `/api/categories/${cat.id}`, {
                    ...cat,
                    order: cat.order - 1,
                  })
                );
              }
            }
          });
        }
      } else {
        categories.forEach(cat => {
          if (cat.order !== null && cat.order !== undefined && cat.order >= newOrder) {
            updates.push(
              apiRequest('PUT', `/api/categories/${cat.id}`, {
                ...cat,
                order: cat.order + 1,
              })
            );
          }
        });
      }

      await Promise.all(updates);

      if (editingItem) {
        return await apiRequest('PUT', `/api/categories/${editingItem.id}`, data);
      } else {
        return await apiRequest('POST', '/api/categories', data);
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      if (editingItem) {
        queryClient.invalidateQueries({ queryKey: [`/api/categories/${editingItem.id}`] });
      }

      await queryClient.refetchQueries({ queryKey: ["/api/categories"] });

      toast({
        title: "Sucesso",
        description: editingItem ? "Categoria atualizada e categorias reorganizadas!" : "Categoria criada e categorias reorganizadas!",
      });
      categoryForm.reset();
      setShowCategoryConflictDialog(false);
      setPendingCategoryData(null);
      setConflictingCategory(null);
      setDialogOpen(false);
      setEditingItem(null);

      setIsCreatingItem(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao reorganizar categorias",
        variant: "destructive",
      });
      setShowCategoryConflictDialog(false);
      setIsCreatingItem(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      setIsDeletingItem(true); // Inicia o estado de deleção
      // Buscar o item antes de excluir para reordenar os demais
      let itemToDelete: any = null;

      if (type === 'banners') {
        itemToDelete = banners?.find(b => b.id === id);
      } else if (type === 'categories') {
        itemToDelete = categories?.find(c => c.id === id);
      }

      // Excluir o item
      await apiRequest("DELETE", `/api/${type}/${id}`);

      // Reordenar itens se necessário
      if (itemToDelete && (type === 'banners' || type === 'categories')) {
        const deletedOrder = itemToDelete.order ?? 0;
        const updates: Promise<any>[] = [];

        if (type === 'banners' && banners) {
          // Reordenar banners na mesma página/vídeo/curso
          banners.forEach(b => {
            if (b.id !== id && b.page === itemToDelete.page) {
              // Para vídeos específicos, verificar também o videoId
              if (itemToDelete.page === 'video_specific' && b.videoId !== itemToDelete.videoId) {
                return;
              }
              // Para cursos específicos, verificar também o courseId
              if (itemToDelete.page === 'course_specific' && b.courseId !== itemToDelete.courseId) { // Adicionado
                return;
              }

              // Decrementar ordem de todos os banners com ordem maior que o excluído
              if (b.order !== null && b.order !== undefined && b.order > deletedOrder) {
                updates.push(
                  apiRequest('PUT', `/api/banners/${b.id}`, {
                    ...b,
                    order: b.order - 1,
                  })
                );
              }
            }
          });
        } else if (type === 'categories' && categories) {
          // Reordenar categorias
          categories.forEach(c => {
            if (c.id !== id && c.order !== null && c.order !== undefined && c.order > deletedOrder) {
              updates.push(
                apiRequest('PUT', `/api/categories/${c.id}`, {
                  ...c,
                  order: c.order - 1,
                })
              );
            }
          });
        }

        // Aguardar todas as atualizações
        await Promise.all(updates);
      }
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/${variables.type}`] });

      // Se for vídeo, também invalidar banners, popups e comentários vinculados
      if (variables.type === 'videos') {
        queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
        queryClient.invalidateQueries({ queryKey: ["/api/popups"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/popups"] });
        queryClient.invalidateQueries({ queryKey: ["/api/comments"] });

        // Limpar cache de popups do sessionStorage
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith('popup_') && key.endsWith('_seen')) {
            sessionStorage.removeItem(key);
          }
        });
      }

      // Se for banner, também invalidar a rota admin
      if (variables.type === 'banners') {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      }
      // Se for produto, também invalidar popups (pois podem ter sido deletados)
      if (variables.type === 'products' || variables.type === 'produtos') {
        queryClient.invalidateQueries({ queryKey: ["/api/popups"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/popups"] });
      }
      // Se for popup, também invalidar a rota admin e limpar cache
      if (variables.type === 'popups') {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/popups"] });
        // Invalidar cache do sistema de popups em todas as páginas
        queryClient.invalidateQueries({ queryKey: ["/api/popups"] });

        // Limpar cache específico do sessionStorage para popups
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith('popup_') && key.endsWith('_seen')) {
            sessionStorage.removeItem(key);
          }
        });
      }
      // Se for notificação, também invalidar a rota admin
      if (variables.type === 'notifications') {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      }

      // Aguardar o refetch das queries principais antes de liberar os botões
      await queryClient.refetchQueries({ queryKey: [`/api/${variables.type}`] });
      if (variables.type === 'banners') {
        await queryClient.refetchQueries({ queryKey: ["/api/admin/banners"] });
      }

      toast({
        title: "Sucesso",
        description: "Item excluído com sucesso!",
      });

      // Liberar botões somente após refetch completo
      setIsDeletingItem(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir item",
        variant: "destructive",
      });
      setIsDeletingItem(false);
    },
  });



  const handleEdit = (item: any, type: string) => {
    setEditingItem(item);
    setDialogOpen(true);
    // setActiveSection(type); // This line was commented out in the original code, assuming it's not essential for the fix.

    switch (type) {
      case 'videos':
        videoForm.reset(item);
        break;
      case 'products':
        productForm.reset(item);
        break;
      case 'coupons':
        const couponData = {
          ...item,
          startDateTime: item.startDateTime ? 
            new Date(item.startDateTime).toISOString().slice(0, 16) : "",
          endDateTime: item.endDateTime ? 
            new Date(item.endDateTime).toISOString().slice(0, 16) : "",
        };
        couponForm.reset(couponData);
        break;
      case 'banners':
        const bannerData = {
          ...item,
          startDateTime: item.startDateTime ? 
            new Date(item.startDateTime).toISOString().slice(0, 16) : "",
          endDateTime: item.endDateTime ? 
            new Date(item.endDateTime).toISOString().slice(0, 16) : "",
          videoId: item.videoId || null, // Garantir que seja null se não existir
          courseId: item.courseId || null, // Garantir que seja null se não existir
          displayOn: item.displayOn || 'both', // Ensure displayOn is set
        };
        bannerForm.reset(bannerData);
        break;
      case 'popups':
        const popupData = {
          ...item,
          startDateTime: item.startDateTime ? 
            new Date(item.startDateTime).toISOString().slice(0, 16) : "",
          endDateTime: item.endDateTime ? 
            new Date(item.endDateTime).toISOString().slice(0, 16) : "",
          targetCourseId: item.targetCourseId || null, // Adicionado
        };
        popupForm.reset(popupData);
        break;
      case 'notifications':
        const notificationData = {
          ...item,
          startDateTime: item.startDateTime ? 
            new Date(item.startDateTime).toISOString().slice(0, 16) : "",
          endDateTime: item.endDateTime ? 
            new Date(item.endDateTime).toISOString().slice(0, 16) : "",
        };
        notificationForm.reset(notificationData);
        break;
      case 'categories':
        categoryForm.reset(item);
        break;
    }
  };

  const handleDelete = (id: string, type: string, title?: string) => {
    setItemToDelete({ id, type, title });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate({ type: itemToDelete.type, id: itemToDelete.id });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Handlers para reorganização de cupons
  const handleConfirmCouponReorder = () => {
    if (pendingCouponData) {
      createCouponMutation.mutate({ ...pendingCouponData, shouldReorder: true });
    }
    setShowCouponConflictDialog(false);
    setPendingCouponData(null);
    setCouponConflictData(null);
  };

  const handleCancelCouponReorder = () => {
    setShowCouponConflictDialog(false);
    setPendingCouponData(null);
    setCouponConflictData(null);
  };

  // Handler para submit de cupons com verificação de conflito
  const handleCouponSubmit = async (data: z.infer<typeof createCouponSchema>) => {
    // Se estiver editando, verificar se a ordem foi realmente alterada
    const isOrderChanged = editingItem ? editingItem.order !== data.order : true;

    if (data.order !== undefined && data.order >= 0 && isOrderChanged) {
      const { hasConflict, conflict } = await checkCouponOrderConflict(data.order);

      if (hasConflict && conflict) {
        setPendingCouponData(data);
        setCouponConflictData({ order: data.order, conflictCoupon: conflict });
        setShowCouponConflictDialog(true);
        return;
      }
    }

    createCouponMutation.mutate(data);
  };

  const handleBannerSubmit = (data: z.infer<typeof createBannerSchema>) => {
    // Validar se vídeo ou curso foi selecionado quando necessário
    if (data.page === 'video_specific' && (!data.videoId || data.videoId.trim() === '')) {
      bannerForm.setError('videoId', { 
        type: 'manual', 
        message: 'Por favor, selecione um vídeo' 
      });
      toast({
        title: "Erro de validação",
        description: "Por favor, selecione um vídeo antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    if (data.page === 'course_specific' && (!data.courseId || data.courseId.trim() === '')) {
      bannerForm.setError('courseId', { 
        type: 'manual', 
        message: 'Por favor, selecione um curso' 
      });
      toast({
        title: "Erro de validação",
        description: "Por favor, selecione um curso antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    const bannerId = editingItem?.id; // ID do banner que está sendo editado

    // Se está editando e não mudou ordem, página, videoId ou courseId, pode salvar direto
    if (editingItem && 
        data.order === originalBannerOrder && 
        data.page === originalBannerPage &&
        data.videoId === originalBannerVideoId &&
        data.courseId === originalBannerCourseId) { // Verificação adicionada para courseId
      createBannerMutation.mutate(data);
      return;
    }

    // Verificar se há conflito de posição
    const conflicting = banners?.find(b => {
      if (b.id === bannerId) return false; // Ignora o próprio banner
      if (b.page !== data.page) return false;
      if (data.page === 'video_specific' && b.videoId !== data.videoId) return false;
      if (data.page === 'course_specific' && b.courseId !== data.courseId) return false; // Verificação adicionada para curso específico
      if (b.order !== data.order) return false;
      return true;
    });

    if (conflicting) {
      setPendingBannerData(data);
      setConflictingBanner(conflicting);
      setShowBannerConflictDialog(true);
    } else {
      createBannerMutation.mutate(data);
    }
  };

  const handleSubmit = (type: string) => {
    switch (type) {
      case 'videos':
        videoForm.handleSubmit((data) => createVideoMutation.mutate(data))();
        break;
      case 'products':
        productForm.handleSubmit((data) => createProductMutation.mutate(data))();
        break;
      case 'coupons':
        couponForm.handleSubmit((data) => createCouponMutation.mutate(data))();
        break;
      case 'banners':
        bannerForm.handleSubmit(handleBannerSubmit)();
        break;
      case 'popups':
        popupForm.handleSubmit((data) => createPopupMutation.mutate(data))();
        break;
      case 'notifications':
        notificationForm.handleSubmit((data) => createNotificationMutation.mutate(data))();
        break;
      case 'categories':
        categoryForm.handleSubmit((data) => {
          if (editingItem && data.order === originalCategoryOrder) {
            createCategoryMutation.mutate(data);
            return;
          }

          const conflicting = categories?.find(
            cat => cat.order === data.order && cat.id !== editingItem?.id
          );

          if (conflicting) {
            setPendingCategoryData(data);
            setConflictingCategory(conflicting);
            setShowCategoryConflictDialog(true);
          } else {
            createCategoryMutation.mutate(data);
          }
        })();
        break;
    }
  };

  const openCreateDialog = (type: string) => {
    setEditingItem(null);
    switch (type) {
      case 'videos':
        videoForm.reset({
          title: "",
          description: "",
          videoUrl: "",
          type: "video",
          thumbnailUrl: "",
          isExclusive: false,
          categoryId: "",
          duration: "",
        });
        break;
      case 'products':
        productForm.reset({
          title: "",
          description: "",
          type: "ebook",
          fileUrl: "",
          coverImageUrl: "",
          categoryId: "",
          isExclusive: false,
          isActive: true,
        });
        break;
      case 'coupons':
        // Calcular a próxima posição disponível
        const maxOrder = coupons && coupons.length > 0 
          ? Math.max(...coupons.map(c => c.order ?? 0))
          : -1;
        const nextOrder = maxOrder + 1;

        couponForm.reset({
          code: "",
          brand: "",
          description: "",
          discount: "",
          categoryId: "",
          isExclusive: false,
          isActive: true,
          storeUrl: "",
          coverImageUrl: "",
          order: nextOrder,
          startDateTime: "",
          endDateTime: ""
        });
        break;
      case 'banners':
        bannerForm.reset({
          title: "",
          description: "",
          imageUrl: "",
          linkUrl: "",
          page: "home",
          isActive: true,
          order: 0,
          showTitle: false,
          showDescription: false,
          showButton: false,
          videoId: null, // Resetar para null
          courseId: null, // Resetar para null
          opensCouponsModal: false,
          startDateTime: "",
          endDateTime: "",
          displayOn: 'both', // Reset to default
        });
        break;
      case 'popups':
        popupForm.reset({
          title: "",
          description: "",
          imageUrl: "",
          linkUrl: "",
          trigger: "login",
          targetPage: "",
          targetVideoId: "",
          targetCourseId: "", // Resetar para null
          showFrequency: "always",
          showTitle: false,
          showDescription: false,
          showButton: false,
          isExclusive: false,
          isActive: true,
          startDateTime: "",
          endDateTime: ""
        });
        break;
      case 'notifications':
        notificationForm.reset({
          title: "",
          description: "",
          imageUrl: "",
          linkUrl: "",
          targetAudience: "all",
          isActive: true,
          startDateTime: "",
          endDateTime: ""
        });
        break;
      case 'categories':
        categoryForm.reset({
          title: "",
          description: "",
          coverImageUrl: "",
          isActive: true,
          order: 0
        });
        break;
    }
    setActiveTab(type);
    setDialogOpen(true);
  };



  // Function to extract YouTube video ID from URL
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#\?]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Remove qualquer caractere especial ou query params
        let videoId = match[1];
        if (videoId.includes('?')) {
          videoId = videoId.split('?')[0];
        }
        if (videoId.includes('&')) {
          videoId = videoId.split('&')[0];
        }
        return videoId.trim();
      }
    }
    return null;
  };

  // Function to check if URL is a playlist
  const isPlaylistUrl = (url: string): boolean => {
    const playlistPatterns = [
      /[?&]list=([^&\n?#]+)/,
      /\/playlist\?list=([^&\n?#]+)/
    ];
    const hasPlaylist = playlistPatterns.some(pattern => pattern.test(url));
    console.log('Verificando se é playlist:', url);
    console.log('Contém parâmetro list?', hasPlaylist);
    return hasPlaylist;
  };

  // Function to fetch video data from YouTube API and auto-fill duration, description and thumbnail
  const handleVideoUrlChange = async (url: string) => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      console.log('Não foi possível extrair o ID do vídeo da URL:', url);
      return;
    }

    try {
      console.log('Buscando dados do YouTube para vídeo:', videoId);

      // Primeiro, detectar o tipo baseado na URL
      const isPlaylist = isPlaylistUrl(url);

      // Se for playlist, calcular duração total
      if (isPlaylist) {
        const playlistIdMatch = url.match(/[?&]list=([^&\n?#]+)/);
        if (playlistIdMatch && playlistIdMatch[1]) {
          const playlistId = playlistIdMatch[1];
          console.log('Detectada playlist, buscando vídeos para calcular duração total:', playlistId);

          try {
            const playlistResponse = await fetch(`/api/youtube/playlist/${playlistId}`);

            if (!playlistResponse.ok) {
              console.error('Erro ao buscar playlist:', playlistResponse.status);
              toast({
                title: "Aviso",
                description: "Não foi possível carregar dados da playlist. Ela pode ser privada ou não existir. Buscar dados do vídeo ao invés?",
                variant: "destructive",
              });
              // Continua para buscar dados do vídeo individual
            } else {
              const playlistData = await playlistResponse.json();

              if (playlistData && playlistData.videos && playlistData.videos.length > 0) {
                // Calcular duração total
                let totalSeconds = 0;
                for (const video of playlistData.videos) {
                  if (video.duration) {
                    const parts = video.duration.split(':');
                    if (parts.length === 3) {
                      const hours = parseInt(parts[0]) || 0;
                      const minutes = parseInt(parts[1]) || 0;
                      const seconds = parseInt(parts[2]) || 0;
                      totalSeconds += hours * 3600 + minutes * 60 + seconds;
                    }
                  }
                }

                // Converter total de segundos para HH:MM:SS
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                const totalDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                videoForm.setValue('duration', totalDuration);
                console.log(`Duração total da playlist calculada: ${totalDuration} (${playlistData.videos.length} vídeos)`);

                // Usar título da playlist
                if (playlistData.playlistTitle) {
                  videoForm.setValue('title', playlistData.playlistTitle);
                  console.log('Título da playlist preenchido:', playlistData.playlistTitle);
                }

                // Usar descrição da playlist (somente se existir e não estiver vazia)
                if (playlistData.playlistDescription && playlistData.playlistDescription.trim() !== '') {
                  videoForm.setValue('description', playlistData.playlistDescription);
                  console.log('Descrição da playlist preenchida');
                } else {
                  console.log('Playlist não possui descrição, deixando campo vazio');
                }

                // Usar thumbnail da playlist
                if (playlistData.playlistThumbnail) {
                  videoForm.setValue('thumbnailUrl', playlistData.playlistThumbnail);
                  console.log('Thumbnail da playlist preenchida');
                }

                videoForm.setValue('type', 'playlist');
                console.log('Tipo alterado para: playlist');

                toast({
                  title: "Playlist detectada!",
                  description: `${playlistData.videos.length} vídeos encontrados. Duração total: ${totalDuration}`,
                });

                return; // Não precisa buscar dados do vídeo individual
              }
            }
          } catch (error) {
            console.error('Erro ao buscar dados da playlist:', error);
          }
        }
      }

      // Se não for playlist ou falhou, buscar dados do vídeo individual
      const response = await fetch(`/api/youtube/video/${videoId}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao buscar dados do YouTube:', response.status, errorText);
        toast({
          title: "Aviso",
          description: "Não foi possível carregar os dados do YouTube",
          variant: "destructive",
        });
        return;
      }

      const videoData = await response.json();
      console.log('Dados recebidos do YouTube:', videoData);

      // Auto-fill title
      if (videoData.title) {
        videoForm.setValue('title', videoData.title);
        console.log('Título preenchido:', videoData.title);
      }

      // Auto-fill type based on detection
      let detectedType = 'video'; // default
      let typeMessage = 'vídeo único';

      if (videoData.isLive) {
        detectedType = 'live';
        typeMessage = 'live';
        console.log('Tipo detectado: live');
      } else {
        console.log('Tipo detectado: vídeo único');
      }

      videoForm.setValue('type', detectedType);
      console.log('Tipo alterado para:', detectedType);

      // Auto-fill duration field - only for non-live videos
      if (videoData.duration && !videoData.isLive) {
        const formattedDuration = ensureHHMMSSFormat(videoData.duration);
        videoForm.setValue('duration', formattedDuration);
        console.log('Duração preenchida:', formattedDuration);
      }

      // Auto-fill description if not already set
      if (videoData.description) {
        videoForm.setValue('description', videoData.description);
        console.log('Descrição preenchida automaticamente');
      }

      // Auto-fill thumbnail if not already set
      if (videoData.thumbnail) {
        videoForm.setValue('thumbnailUrl', videoData.thumbnail);
        console.log('Thumbnail preenchida automaticamente');
      }

      // Show appropriate toast message
      toast({
        title: `${typeMessage.charAt(0).toUpperCase() + typeMessage.slice(1)} detectada!`,
        description: "Título, tipo, descrição e thumbnail preenchidos automaticamente.",
      });
    } catch (error) {
      console.error('Erro ao buscar dados do vídeo:', error);
      toast({
        title: "Erro",
        description: "Falha ao buscar dados do YouTube",
        variant: "destructive",
      });
    }
  };

  // Function to ensure duration is in HH:MM:SS format
  const ensureHHMMSSFormat = (duration: string): string => {
    // If already in HH:MM:SS format, return as is
    if (/^\d{2}:\d{2}:\d{2}$/.test(duration)) {
      return duration;
    }

    // If in MM:SS format, add 00: prefix
    if (/^\d{1,2}:\d{2}$/.test(duration)) {
      const parts = duration.split(':');
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);

      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        return `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }

    // If in seconds format, convert to HH:MM:SS
    const totalSeconds = parseInt(duration);
    if (!isNaN(totalSeconds)) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Default return
    return duration;
  };

  // Skeleton de loading geral para toda a página de admin
  if (isMainDataLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />

        <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
          <div className="container mx-auto px-6 py-8">
            {/* Header skeleton - igual ao real */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <Skeleton className="h-9 w-80 mb-2" />
                <Skeleton className="h-5 w-64" />
              </div>
              <div className="flex items-center gap-3 bg-card rounded-lg p-3 border">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-12" />
                </div>
              </div>
            </div>

            {/* Stats Cards skeleton - grid igual ao real */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 text-center">
                    <Skeleton className="w-12 h-12 rounded-full mx-auto mb-3" />
                    <Skeleton className="h-8 w-8 mx-auto mb-1" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs skeleton - estrutura igual ao real */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="grid w-full max-w-2xl grid-cols-8 h-10 bg-muted rounded-lg p-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 rounded-md" />
                  ))}
                </div>
                <Skeleton className="h-10 w-32" />
              </div>

              {/* Tab content skeleton - Card igual ao real */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton className="w-5 h-5" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                        <Skeleton className="h-16 w-24 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <div className="flex space-x-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
        <div className="container mx-auto px-6 py-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold text-foreground">Painel Administrativo</h2>
                <p className="text-muted-foreground">Gerencie conteúdos, produtos e cupons</p>
              </div>

              <div className="flex items-center gap-3 bg-card rounded-lg p-3 border">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Visualizar como:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'premium' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('premium')}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    Premium
                  </Button>
                  <Button
                    variant={viewMode === 'free' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('free')}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    Free
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Play className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {videos?.length || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Vídeos</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Download className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {products?.length || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Produtos</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Tag className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {coupons?.length || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Cupons</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Image className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {banners?.length || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Banners</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="w-6 h-6 text-orange-500 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {popups?.length || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Popups</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="w-6 h-6 text-purple-500 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {notifications?.length || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Notificações</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="w-6 h-6 text-amber-500 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>
                        <line x1="8" y1="1" x2="8" y2="4"/>
                        <line x1="16" y1="1" x2="16" y2="4"/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {categories?.length || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Categorias</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {usersData?.length || 0}
                  </h3>
                  <p className="text-sm text-muted-foreground">Usuários</p>
                </CardContent>
              </Card>
            </div>

            {/* Management Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-6">
                <TabsList className="grid w-full grid-cols-8 gap-1">
                  <TabsTrigger value="videos" data-testid="tab-videos" className="text-xs sm:text-sm">Vídeos</TabsTrigger>
                  <TabsTrigger value="products" data-testid="tab-products" className="text-xs sm:text-sm">Produtos</TabsTrigger>
                  <TabsTrigger value="coupons" data-testid="tab-coupons" className="text-xs sm:text-sm">Cupons</TabsTrigger>
                  <TabsTrigger value="banners" data-testid="tab-banners" className="text-xs sm:text-sm">Banners</TabsTrigger>
                  <TabsTrigger value="popups" data-testid="tab-popups" className="text-xs sm:text-sm">Popups</TabsTrigger>
                  <TabsTrigger value="notifications" data-testid="tab-notifications" className="text-xs sm:text-sm">Notificações</TabsTrigger>
                  <TabsTrigger value="categories" data-testid="tab-categories" className="text-xs sm:text-sm">Categorias</TabsTrigger>
                  <TabsTrigger value="users" data-testid="tab-users" className="text-xs sm:text-sm">Usuários</TabsTrigger>
                </TabsList>

                {activeTab !== 'users' && (
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => openCreateDialog(activeTab)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        data-testid="button-create-item"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar {activeTab === 'videos' ? 'Vídeo' : activeTab === 'products' ? 'Produto' : activeTab === 'coupons' ? 'Cupom' : activeTab === 'banners' ? 'Banner' : activeTab === 'popups' ? 'Popup' : activeTab === 'categories' ? 'Categoria' : 'Notificação'}
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? 'Editar' : 'Criar'} {activeTab === 'videos' ? 'Vídeo' : activeTab === 'products' ? 'Produto' : activeTab === 'coupons' ? 'Cupom' : activeTab === 'banners' ? 'Banner' : activeTab === 'popups' ? 'Popup' : activeTab === 'categories' ? 'Categoria' : 'Notificação'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingItem ? 'Edite os dados do' : 'Preencha os dados do'} {activeTab === 'videos' ? 'vídeo' : activeTab === 'products' ? 'produto' : activeTab === 'coupons' ? 'cupom' : activeTab === 'banners' ? 'banner' : activeTab === 'popups' ? 'popup' : activeTab === 'categories' ? 'categoria' : 'notificação'} abaixo.
                      </DialogDescription>
                    </DialogHeader>

                    {/* Video Form */}
                    {activeTab === 'videos' && (
                      <form onSubmit={videoForm.handleSubmit((data) => createVideoMutation.mutate(data))} className="space-y-4">
                        <div>
                          <Label htmlFor="video-title">Título <span className="text-destructive">*</span></Label>
                          <Input
                            id="video-title"
                            {...videoForm.register("title")}
                            placeholder="Digite o título do vídeo"
                            data-testid="input-video-title"
                          />
                          {videoForm.formState.errors.title && (
                            <p className="text-sm text-destructive mt-1">{videoForm.formState.errors.title.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="video-description">Descrição <span className="text-destructive">*</span></Label>
                          <Textarea
                            id="video-description"
                            {...videoForm.register("description")}
                            placeholder="Descrição do vídeo"
                            data-testid="textarea-video-description"
                          />
                          {videoForm.formState.errors.description && (
                            <p className="text-sm text-destructive mt-1">{videoForm.formState.errors.description.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="video-url">URL do Vídeo <span className="text-destructive">*</span></Label>
                          <Input
                            id="video-url"
                            {...videoForm.register("videoUrl")}
                            placeholder="https://..."
                            data-testid="input-video-url"
                            onChange={(e) => {
                              videoForm.setValue("videoUrl", e.target.value);
                              if (e.target.value) {
                                handleVideoUrlChange(e.target.value);
                              }
                            }}
                          />
                          {videoForm.formState.errors.videoUrl && (
                            <p className="text-sm text-destructive mt-1">{videoForm.formState.errors.videoUrl.message}</p>
                          )}
                        </div>

                        <ImageUpload
                          id="video-thumbnail"
                          label="Imagem de Capa"
                          value={videoForm.watch("thumbnailUrl")}
                          onChange={(base64) => videoForm.setValue("thumbnailUrl", base64)}
                          placeholder="Selecionar imagem de capa"
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="video-type">Tipo <span className="text-destructive">*</span></Label>
                            <Select
                              value={videoForm.watch("type") || "video"}
                              onValueChange={(value) => videoForm.setValue("type", value)}
                            >
                              <SelectTrigger data-testid="select-video-type">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="video">Vídeo</SelectItem>
                                <SelectItem value="playlist">Playlist</SelectItem>
                                <SelectItem value="live">Live</SelectItem>
                              </SelectContent>
                            </Select>
                            {videoForm.formState.errors.type && (
                              <p className="text-sm text-destructive mt-1">{videoForm.formState.errors.type.message}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="video-category">Categoria <span className="text-destructive">*</span></Label>
                            <Select
                              value={videoForm.watch("categoryId") || ""}
                              onValueChange={(value) => videoForm.setValue("categoryId", value)}
                            >
                              <SelectTrigger data-testid="select-video-category">
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories?.filter(cat => cat.isActive).map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {videoForm.formState.errors.categoryId && (
                              <p className="text-sm text-destructive mt-1">{videoForm.formState.errors.categoryId.message}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="video-duration">Duração</Label>
                          <Input
                            id="video-duration"
                            type="text"
                            placeholder="Será preenchido automaticamente (HH:MM:SS)"
                            value={videoForm.watch("duration") || ""}
                            readOnly
                            className="bg-muted cursor-not-allowed"
                            data-testid="input-video-duration"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={videoForm.watch("isExclusive") || false}
                            onCheckedChange={(checked) => videoForm.setValue("isExclusive", checked)}
                            data-testid="switch-video-exclusive"
                          />
                          <Label>Conteúdo Exclusivo</Label>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={createVideoMutation.isPending}
                          data-testid="button-save-video"
                        >
                          {createVideoMutation.isPending ? "Salvando..." : "Salvar Vídeo"}
                        </Button>
                      </form>
                    )}

                    {/* Product Form */}
                    {activeTab === 'products' && (
                      <form onSubmit={productForm.handleSubmit((data) => createProductMutation.mutate(data))} className="space-y-4">
                        <div>
                          <Label htmlFor="product-title">Título <span className="text-destructive">*</span></Label>
                          <Input
                            id="product-title"
                            {...productForm.register("title")}
                            placeholder="Digite o título do produto"
                            data-testid="input-product-title"
                          />
                          {productForm.formState.errors.title && (
                            <p className="text-sm text-destructive mt-1">{productForm.formState.errors.title.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="product-description">Descrição <span className="text-destructive">*</span></Label>
                          <Textarea
                            id="product-description"
                            {...productForm.register("description")}
                            placeholder="Descrição do produto"
                            data-testid="textarea-product-description"
                          />
                          {productForm.formState.errors.description && (
                            <p className="text-sm text-destructive mt-1">{productForm.formState.errors.description.message}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="product-type">Tipo</Label>
                            <Select
                              value={productForm.watch("type") || ""}
                              onValueChange={(value) => productForm.setValue("type", value)}
                            >
                              <SelectTrigger data-testid="select-product-type">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ebook">E-book</SelectItem>
                                <SelectItem value="course_video">Curso - Vídeo Único</SelectItem>
                                <SelectItem value="course_playlist">Curso - Playlist</SelectItem>
                                <SelectItem value="pdf">PDF</SelectItem>
                                <SelectItem value="checklist">Checklist</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="product-file">
                              {(productForm.watch("type") === "course_video" || productForm.watch("type") === "course_playlist") ? "URL do YouTube" : "URL do Arquivo"} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="product-file"
                              {...productForm.register("fileUrl")}
                              placeholder={(productForm.watch("type") === "course_video" || productForm.watch("type") === "course_playlist")
                                ? "https://www.youtube.com/watch?v=... ou https://www.youtube.com/playlist?list=..." 
                                : "https://..."}
                              data-testid="input-product-file"
                              onChange={async (e) => {
                                const url = e.target.value.trim();
                                productForm.setValue("fileUrl", e.target.value);

                                if (!url) return;

                                // Verificar se é URL do YouTube
                                const isYouTubeUrl = /(?:youtube\.com|youtu\.be)/.test(url);

                                if (isYouTubeUrl) {
                                  // Verificar se é playlist ou vídeo único
                                  const isPlaylist = /[?&]list=([^&\n?#]+)/.test(url);

                                  if (isPlaylist) {
                                    productForm.setValue("type", "course_playlist");
                                    console.log('URL de Playlist do YouTube detectada, tipo alterado para: course_playlist');
                                  } else {
                                    productForm.setValue("type", "course_video");
                                    console.log('URL de Vídeo Único do YouTube detectada, tipo alterado para: course_video');
                                  }

                                  try {
                                    if (isPlaylist) {
                                      // Buscar dados da playlist
                                      const playlistIdMatch = url.match(/[?&]list=([^&\n?#]+)/);
                                      if (playlistIdMatch && playlistIdMatch[1]) {
                                        const playlistId = playlistIdMatch[1];
                                        console.log('Detectada playlist de produto, buscando dados:', playlistId);

                                        const playlistResponse = await fetch(`/api/youtube/playlist/${playlistId}`);
                                        if (playlistResponse.ok) {
                                          const playlistData = await playlistResponse.json();

                                          if (playlistData && playlistData.videos && playlistData.videos.length > 0) {
                                            // Preencher título da playlist
                                            if (playlistData.playlistTitle) {
                                              productForm.setValue('title', playlistData.playlistTitle);
                                            }

                                            // Preencher descrição se existir
                                            if (playlistData.playlistDescription && playlistData.playlistDescription.trim() !== '') {
                                              productForm.setValue('description', playlistData.playlistDescription);
                                            }

                                            // Preencher thumbnail
                                            if (playlistData.playlistThumbnail) {
                                              productForm.setValue('coverImageUrl', playlistData.playlistThumbnail);
                                            }

                                            toast({
                                              title: "Playlist detectada!",
                                              description: `${playlistData.videos.length} vídeos encontrados. Tipo alterado para "Curso - Playlist".`,
                                            });
                                          }
                                        }
                                      }
                                    } else {
                                      // É vídeo único - extrair ID e buscar dados
                                      const videoIdMatch = url.match(/(?:v=|youtu\.be\/|embed\/|v\/|watch\?.*&v=)([^&\n?#]+)/);
                                      if (videoIdMatch && videoIdMatch[1]) {
                                        let videoId = videoIdMatch[1];
                                        if (videoId.includes('?')) {
                                          videoId = videoId.split('?')[0];
                                        }

                                        console.log('Detectado vídeo único de produto, buscando dados:', videoId);

                                        const videoResponse = await fetch(`/api/youtube/video/${videoId}`);
                                        if (videoResponse.ok) {
                                          const videoData = await videoResponse.json();

                                          // Preencher título
                                          if (videoData.title) {
                                            productForm.setValue('title', videoData.title);
                                          }

                                          // Preencher descrição
                                          if (videoData.description) {
                                            productForm.setValue('description', videoData.description);
                                          }

                                          // Preencher thumbnail
                                          if (videoData.thumbnail) {
                                            productForm.setValue('coverImageUrl', videoData.thumbnail);
                                          }

                                          toast({
                                            title: "Vídeo do YouTube detectado!",
                                            description: "Tipo alterado para 'Curso - Vídeo Único'. Dados preenchidos automaticamente.",
                                          });
                                        }
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Erro ao buscar dados do YouTube para produto:', error);
                                    toast({
                                      title: "Erro",
                                      description: "Não foi possível carregar os dados do YouTube",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                            />
                            {productForm.formState.errors.fileUrl && (
                              <p className="text-sm text-destructive mt-1">{productForm.formState.errors.fileUrl.message}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <ImageUpload
                            id="product-cover"
                            label="Imagem de Capa"
                            value={productForm.watch("coverImageUrl")}
                            onChange={(base64) => productForm.setValue("coverImageUrl", base64)}
                            placeholder="Selecionar imagem de capa"
                            required
                          />
                          {productForm.formState.errors.coverImageUrl && (
                            <p className="text-sm text-destructive mt-1">{productForm.formState.errors.coverImageUrl.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="product-category">Categoria <span className="text-destructive">*</span></Label>
                          <Select
                            value={productForm.watch("categoryId") || ""}
                            onValueChange={(value) => productForm.setValue("categoryId", value)}
                          >
                            <SelectTrigger data-testid="select-product-category">
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.filter(cat => cat.isActive).map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {productForm.formState.errors.categoryId && (
                            <p className="text-sm text-destructive mt-1">{productForm.formState.errors.categoryId.message}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={productForm.watch("isExclusive") || false}
                              onCheckedChange={(checked) => productForm.setValue("isExclusive", checked)}
                              data-testid="switch-product-exclusive"
                            />
                            <Label>Conteúdo Exclusivo</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={productForm.watch("isActive") || false}
                              onCheckedChange={(checked) => productForm.setValue("isActive", checked)}
                              data-testid="switch-product-active"
                            />
                            <Label>Produto Ativo</Label>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={createProductMutation.isPending}
                          data-testid="button-save-product"
                        >
                          {createProductMutation.isPending ? "Salvando..." : "Salvar Produto"}
                        </Button>
                      </form>
                    )}

                    {/* Coupon Form */}
                    {activeTab === 'coupons' && (
                      <form onSubmit={couponForm.handleSubmit(handleCouponSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="coupon-code">Código <span className="text-destructive">*</span></Label>
                            <Input
                              id="coupon-code"
                              {...couponForm.register("code")}
                              placeholder="DESCONTO20"
                              data-testid="input-coupon-code"
                            />
                            {couponForm.formState.errors.code && (
                              <p className="text-sm text-destructive mt-1">{couponForm.formState.errors.code.message}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="coupon-brand">Marca <span className="text-destructive">*</span></Label>
                            <Input
                              id="coupon-brand"
                              {...couponForm.register("brand")}
                              placeholder="Nome da marca"
                              data-testid="input-coupon-brand"
                            />
                            {couponForm.formState.errors.brand && (
                              <p className="text-sm text-destructive mt-1">{couponForm.formState.errors.brand.message}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="coupon-description">Descrição</Label>
                          <Input
                            id="coupon-description"
                            {...couponForm.register("description")}
                            placeholder="Descrição do desconto"
                            data-testid="input-coupon-description"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="coupon-discount">Desconto</Label>
                            <Input
                              id="coupon-discount"
                              {...couponForm.register("discount")}
                              placeholder="20% OFF"
                              data-testid="input-coupon-discount"
                            />
                          </div>

                          <div>
                            <Label htmlFor="coupon-category">Categoria <span className="text-destructive">*</span></Label>
                            <Select
                              value={couponForm.watch("categoryId") || ""}
                              onValueChange={(value) => couponForm.setValue("categoryId", value)}
                            >
                              <SelectTrigger data-testid="select-coupon-category">
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories?.filter(cat => cat.isActive).map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {couponForm.formState.errors.categoryId && (
                              <p className="text-sm text-destructive mt-1">{couponForm.formState.errors.categoryId.message}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="coupon-store">URL da Loja <span className="text-destructive">*</span></Label>
                          <Input
                            id="coupon-store"
                            {...couponForm.register("storeUrl")}
                            placeholder="https://..."
                            data-testid="input-coupon-store"
                          />
                          {couponForm.formState.errors.storeUrl && (
                            <p className="text-sm text-destructive mt-1">{couponForm.formState.errors.storeUrl.message}</p>
                          )}
                        </div>

                        <ImageUpload
                          id="coupon-cover"
                          label="Imagem de Capa (Página de Cupons)"
                          value={couponForm.watch("coverImageUrl")}
                          onChange={(base64) => couponForm.setValue("coverImageUrl", base64)}
                          placeholder="Selecionar imagem de capa"
                        />

                        <ImageUpload
                          id="coupon-modal"
                          label="Imagem para Modal Bio"
                          value={couponForm.watch("modalImageUrl")}
                          onChange={(base64) => couponForm.setValue("modalImageUrl", base64)}
                          placeholder="Selecionar imagem do modal (ou deixe vazio para usar a imagem de capa)"
                        />

                        <div>
                          <Label htmlFor="coupon-order">Ordem de Exibição</Label>
                          <Input
                            id="coupon-order"
                            type="number"
                            {...couponForm.register("order", { valueAsNumber: true })}
                            placeholder="0"
                            data-testid="input-coupon-order"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="coupon-start">Data/Hora de Início</Label>
                            <Input
                              id="coupon-start"
                              type="datetime-local"
                              {...couponForm.register("startDateTime")}
                              onKeyDown={(e) => {
                                if (e.key === 'Delete') {
                                  e.preventDefault();
                                  couponForm.setValue("startDateTime", "");
                                }
                              }}
                              data-testid="input-coupon-start-datetime"
                            />
                          </div>

                          <div>
                            <Label htmlFor="coupon-end">Data/Hora de Fim</Label>
                            <Input
                              id="coupon-end"
                              type="datetime-local"
                              {...couponForm.register("endDateTime")}
                              onKeyDown={(e) => {
                                if (e.key === 'Delete') {
                                  e.preventDefault();
                                  couponForm.setValue("endDateTime", "");
                                }
                              }}
                              data-testid="input-coupon-end-datetime"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={couponForm.watch("isExclusive") || false}
                              onCheckedChange={(checked) => couponForm.setValue("isExclusive", checked)}
                              data-testid="switch-coupon-exclusive"
                            />
                            <Label>Conteúdo Exclusivo</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={couponForm.watch("isActive") || false}
                              onCheckedChange={(checked) => couponForm.setValue("isActive", checked)}
                              data-testid="switch-coupon-active"
                            />
                            <Label>Cupom Ativo</Label>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={createCouponMutation.isPending}
                          data-testid="button-save-coupon"
                        >
                          {createCouponMutation.isPending ? "Salvando..." : "Salvar Cupom"}
                        </Button>
                      </form>
                    )}

                    {/* Banner Form */}
                    {activeTab === 'banners' && (
                      <form onSubmit={bannerForm.handleSubmit(handleBannerSubmit)} className="space-y-4">
                        <div>
                          <Label htmlFor="banner-title">Título <span className="text-destructive">*</span></Label>
                          <Input
                            id="banner-title"
                            {...bannerForm.register("title")}
                            placeholder="Digite o título do banner"
                            data-testid="input-banner-title"
                          />
                          {bannerForm.formState.errors.title && (
                            <p className="text-sm text-destructive mt-1">{bannerForm.formState.errors.title.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="banner-description">Descrição <span className="text-destructive">*</span></Label>
                          <Textarea
                            id="banner-description"
                            {...bannerForm.register("description")}
                            placeholder="Descrição do banner"
                            data-testid="textarea-banner-description"
                          />
                          {bannerForm.formState.errors.description && (
                            <p className="text-sm text-destructive mt-1">{bannerForm.formState.errors.description.message}</p>
                          )}
                        </div>

                        <div>
                          <ImageUpload
                            id="banner-image"
                            label="Imagem do Banner"
                            value={bannerForm.watch("imageUrl")}
                            onChange={(base64) => bannerForm.setValue("imageUrl", base64)}
                            placeholder="Selecionar imagem do banner"
                            required
                          />
                          {bannerForm.formState.errors.imageUrl && (
                            <p className="text-sm text-destructive mt-1">{bannerForm.formState.errors.imageUrl.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="banner-link">URL de Destino</Label>
                          <Input
                            id="banner-link"
                            {...bannerForm.register("linkUrl")}
                            placeholder="https://..."
                            data-testid="input-banner-link"
                          />
                        </div>

                        <div>
                          <Label htmlFor="banner-display-on">Exibir em</Label>
                          <Select
                            value={bannerForm.watch("displayOn") || "both"}
                            onValueChange={(value) => bannerForm.setValue("displayOn", value)}
                          >
                            <SelectTrigger data-testid="select-banner-display-on">
                              <SelectValue placeholder="Selecione onde exibir" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="both">🖥️📱 Desktop e Mobile</SelectItem>
                              <SelectItem value="desktop">🖥️ Apenas Desktop</SelectItem>
                              <SelectItem value="mobile">📱 Apenas Mobile</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="banner-order">Ordem</Label>
                            <Input
                              id="banner-order"
                              type="number"
                              {...bannerForm.register("order", { valueAsNumber: true })}
                              placeholder="0"
                              data-testid="input-banner-order"
                            />
                          </div>

                          <div>
                            <Label htmlFor="banner-page">Página</Label>
                            <Select 
                              value={bannerForm.watch("page") || "home"}
                              onValueChange={(value) => bannerForm.setValue("page", value)}
                            >
                              <SelectTrigger data-testid="select-banner-page">
                                <SelectValue placeholder="Selecione a página" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="home">Página Inicial</SelectItem>
                                <SelectItem value="videos">Vídeos Exclusivos</SelectItem>
                                <SelectItem value="products">Produtos Digitais</SelectItem>
                                <SelectItem value="coupons">Cupons</SelectItem>
                                <SelectItem value="community">Comunidade</SelectItem>
                                <SelectItem value="profile">Perfil</SelectItem>
                                <SelectItem value="bio">Link da Bio</SelectItem>
                                <SelectItem value="video_specific">Video Específico</SelectItem>
                                <SelectItem value="course_specific">Curso Específico</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Campo para selecionar vídeo específico */}
                        {bannerForm.watch("page") === "video_specific" && (
                          <ResourceSearchSelect
                            type="video"
                            value={bannerForm.watch("videoId")}
                            onChange={(id) => bannerForm.setValue("videoId", id)}
                            label="Vídeo"
                            placeholder="Busque e selecione um vídeo"
                            required
                            error={bannerForm.formState.errors.videoId?.message}
                          />
                        )}

                        {/* Campo para selecionar curso específico */}
                        {bannerForm.watch("page") === "course_specific" && (
                          <ResourceSearchSelect
                            type="course"
                            value={bannerForm.watch("courseId")}
                            onChange={(id) => bannerForm.setValue("courseId", id)}
                            label="Curso"
                            placeholder="Busque e selecione um curso"
                            required
                          />
                        )}

                        {/* Campos de Data e Hora para Programação */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="banner-start-datetime">Data/Hora Inicial</Label>
                            <Input
                              id="banner-start-datetime"
                              type="datetime-local"
                              {...bannerForm.register("startDateTime")}
                              onKeyDown={(e) => {
                                if (e.key === 'Delete') {
                                  e.preventDefault();
                                  bannerForm.setValue("startDateTime", "");
                                }
                              }}
                              data-testid="input-banner-start-datetime"
                            />
                          </div>

                          <div>
                            <Label htmlFor="banner-end-datetime">Data/Hora Final</Label>
                            <Input
                              id="banner-end-datetime"
                              type="datetime-local"
                              {...bannerForm.register("endDateTime")}
                              onKeyDown={(e) => {
                                if (e.key === 'Delete') {
                                  e.preventDefault();
                                  bannerForm.setValue("endDateTime", "");
                                }
                              }}
                              data-testid="input-banner-end-datetime"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={bannerForm.watch("showTitle") ?? true}
                              onCheckedChange={(checked) => {
                                bannerForm.setValue("showTitle", checked);
                                bannerForm.trigger("showTitle");
                              }}
                              data-testid="switch-banner-show-title"
                            />
                            <Label htmlFor="switch-banner-show-title">Mostrar Título</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={bannerForm.watch("showDescription") ?? true}
                              onCheckedChange={(checked) => {
                                bannerForm.setValue("showDescription", checked);
                                bannerForm.trigger("showDescription");
                              }}
                              data-testid="switch-banner-show-description"
                            />
                            <Label htmlFor="switch-banner-show-description">Mostrar Descrição</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={bannerForm.watch("showButton") ?? true}
                              onCheckedChange={(checked) => {
                                bannerForm.setValue("showButton", checked);
                                bannerForm.trigger("showButton");
                              }}
                              data-testid="switch-banner-show-button"
                            />
                            <Label htmlFor="switch-banner-show-button">Mostrar Botão</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={bannerForm.watch("isActive") ?? false}
                              onCheckedChange={(checked) => {
                                bannerForm.setValue("isActive", checked);
                                bannerForm.trigger("isActive");
                              }}
                              data-testid="switch-banner-active"
                            />
                            <Label htmlFor="switch-banner-active">Banner Ativo</Label>
                          </div>

                          {/* Campo para abrir modal de cupons - apenas para página bio */}
                          {bannerForm.watch("page") === "bio" && (
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={bannerForm.watch("opensCouponsModal") ?? false}
                                onCheckedChange={(checked) => {
                                  bannerForm.setValue("opensCouponsModal", checked);
                                  bannerForm.trigger("opensCouponsModal");
                                }}
                                data-testid="switch-banner-opens-coupons-modal"
                              />
                              <Label htmlFor="switch-banner-opens-coupons-modal">Abrir Modal de Cupons</Label>
                            </div>
                          )}
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={createBannerMutation.isPending || reorganizeBannerMutation.isPending}
                          data-testid="button-save-banner"
                        >
                          {reorganizeBannerMutation.isPending ? "Reorganizando..." : createBannerMutation.isPending ? "Salvando..." : "Salvar Banner"}
                        </Button>
                      </form>
                    )}

                    {/* Popup Form */}
                    {activeTab === 'popups' && (
                      <form onSubmit={popupForm.handleSubmit((data) => {
                        // Validar se vídeo ou curso foi selecionado quando necessário
                        if (data.targetPage === 'video_specific' && (!data.targetVideoId || data.targetVideoId.trim() === '')) {
                          popupForm.setError('targetVideoId', { 
                            type: 'manual', 
                            message: 'Por favor, selecione um vídeo' 
                          });
                          toast({
                            title: "Erro de validação",
                            description: "Por favor, selecione um vídeo antes de salvar.",
                            variant: "destructive",
                          });
                          return;
                        }

                        if (data.targetPage === 'course_specific' && (!data.targetCourseId || data.targetCourseId.trim() === '')) {
                          popupForm.setError('targetCourseId', { 
                            type: 'manual', 
                            message: 'Por favor, selecione um curso' 
                          });
                          toast({
                            title: "Erro de validação",
                            description: "Por favor, selecione um curso antes de salvar.",
                            variant: "destructive",
                          });
                          return;
                        }

                        createPopupMutation.mutate(data);
                      })} className="space-y-4">
                        <div>
                          <Label htmlFor="popup-title">Título <span className="text-destructive">*</span></Label>
                          <Input
                            id="popup-title"
                            {...popupForm.register("title")}
                            placeholder="Digite o título do popup"
                            data-testid="input-popup-title"
                          />
                          {popupForm.formState.errors.title && (
                            <p className="text-sm text-destructive mt-1">{popupForm.formState.errors.title.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="popup-description">Descrição <span className="text-destructive">*</span></Label>
                          <Textarea
                            id="popup-description"
                            {...popupForm.register("description")}
                            placeholder="Descrição do popup"
                            data-testid="textarea-popup-description"
                          />
                          {popupForm.formState.errors.description && (
                            <p className="text-sm text-destructive mt-1">{popupForm.formState.errors.description.message}</p>
                          )}
                        </div>

                        <div>
                          <ImageUpload
                            id="popup-image"
                            label="Imagem do Popup"
                            value={popupForm.watch("imageUrl")}
                            onChange={(base64) => popupForm.setValue("imageUrl", base64)}
                            placeholder="Selecionar imagem do popup"
                            required
                          />
                          {popupForm.formState.errors.imageUrl && (
                            <p className="text-sm text-destructive mt-1">{popupForm.formState.errors.imageUrl.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="popup-link">URL de Destino</Label>
                          <Input
                            id="popup-link"
                            {...popupForm.register("linkUrl")}
                            placeholder="https://..."
                            data-testid="input-popup-link"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="popup-trigger">Gatilho de Exibição</Label>
                            <Select
                              value={popupForm.watch("trigger") || ""}
                              onValueChange={(value) => {
                                popupForm.setValue("trigger", value);
                                // Se for agendado, definir frequência automaticamente
                                if (value === "scheduled") {
                                  popupForm.setValue("showFrequency", "once_per_session");
                                }
                              }}
                            >
                              <SelectTrigger data-testid="select-popup-trigger">
                                <SelectValue placeholder="Selecione o gatilho" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="login">Ao fazer login</SelectItem>
                                <SelectItem value="logout">Ao sair do sistema</SelectItem>
                                <SelectItem value="page_specific">Página específica</SelectItem>
                                <SelectItem value="scheduled">Agendado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="popup-frequency">Frequência</Label>
                            {popupForm.watch("trigger") === "scheduled" ? (
                              <Input
                                value="Uma vez por sessão"
                                disabled
                                className="bg-gray-100 text-gray-600"
                                data-testid="input-popup-frequency-scheduled"
                              />
                            ) : (
                              <Select
                                value={popupForm.watch("showFrequency") || ""}
                                onValueChange={(value) => popupForm.setValue("showFrequency", value)}
                              >
                                <SelectTrigger data-testid="select-popup-frequency">
                                  <SelectValue placeholder="Selecione a frequência" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="always">Sempre mostrar</SelectItem>
                                  <SelectItem value="once_per_session">Uma vez por sessão</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>

                        {/* Campo para página específica */}
                        {popupForm.watch("trigger") === "page_specific" && (
                          <>
                            <div>
                              <Label htmlFor="popup-target-page">Página de Destino</Label>
                              <Select
                                value={popupForm.watch("targetPage") || ""}
                                onValueChange={(value) => popupForm.setValue("targetPage", value)}
                              >
                                <SelectTrigger data-testid="select-popup-target-page">
                                  <SelectValue placeholder="Selecione a página" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="home">Página Inicial</SelectItem>
                                  <SelectItem value="videos">Vídeos Exclusivos</SelectItem>
                                  <SelectItem value="products">Produtos Digitais</SelectItem>
                                  <SelectItem value="coupons">Cupons</SelectItem>
                                  <SelectItem value="community">Comunidade</SelectItem>
                                  <SelectItem value="profile">Perfil</SelectItem>
                                  <SelectItem value="video_specific">Vídeo Específico</SelectItem>
                                  <SelectItem value="course_specific">Curso Específico</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {popupForm.watch("targetPage") === "video_specific" && (
                              <ResourceSearchSelect
                                type="video"
                                value={popupForm.watch("targetVideoId")}
                                onChange={(id) => popupForm.setValue("targetVideoId", id)}
                                label="Vídeo"
                                placeholder="Busque e selecione um vídeo"
                                required
                                error={popupForm.formState.errors.targetVideoId?.message}
                              />
                            )}

                            {popupForm.watch("targetPage") === "course_specific" && (
                              <ResourceSearchSelect
                                type="course"
                                value={popupForm.watch("targetCourseId")}
                                onChange={(id) => popupForm.setValue("targetCourseId", id)}
                                label="Curso"
                                placeholder="Busque e selecione um curso"
                                required
                                error={popupForm.formState.errors.targetCourseId?.message}
                              />
                            )}
                          </>
                        )}

                        {/* Campos de Data e Hora para Agendamento */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="popup-start-datetime">Data/Hora Inicial</Label>
                            <Input
                              id="popup-start-datetime"
                              type="datetime-local"
                              {...popupForm.register("startDateTime")}
                              onKeyDown={(e) => {
                                if (e.key === 'Delete') {
                                  e.preventDefault();
                                  popupForm.setValue("startDateTime", "");
                                }
                              }}
                              data-testid="input-popup-start-datetime"
                            />
                          </div>

                          <div>
                            <Label htmlFor="popup-end-datetime">Data/Hora Final</Label>
                            <Input
                              id="popup-end-datetime"
                              type="datetime-local"
                              {...popupForm.register("endDateTime")}
                              onKeyDown={(e) => {
                                if (e.key === 'Delete') {
                                  e.preventDefault();
                                  popupForm.setValue("endDateTime", "");
                                }
                              }}
                              data-testid="input-popup-end-datetime"
                            />
                          </div>
                        </div>

                        {/* Controles de Exibição */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={popupForm.watch("showTitle") ?? true}
                              onCheckedChange={(checked) => {
                                popupForm.setValue("showTitle", checked);
                                popupForm.trigger("showTitle");
                              }}
                              data-testid="switch-popup-show-title"
                            />
                            <Label htmlFor="switch-popup-show-title">Mostrar Título</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={popupForm.watch("showDescription") ?? true}
                              onCheckedChange={(checked) => {
                                popupForm.setValue("showDescription", checked);
                                popupForm.trigger("showDescription");
                              }}
                              data-testid="switch-popup-show-description"
                            />
                            <Label htmlFor="switch-popup-show-description">Mostrar Descrição</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={popupForm.watch("showButton") ?? true}
                              onCheckedChange={(checked) => {
                                popupForm.setValue("showButton", checked);
                                popupForm.trigger("showButton");
                              }}
                              data-testid="switch-popup-show-button"
                            />
                            <Label htmlFor="switch-popup-show-button">Mostrar Botão</Label>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={popupForm.watch("isExclusive") || false}
                              onCheckedChange={(checked) => popupForm.setValue("isExclusive", checked)}
                              data-testid="switch-popup-exclusive"
                            />
                            <Label>Exclusivo para Premium</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={popupForm.watch("isActive") || false}
                              onCheckedChange={(checked) => popupForm.setValue("isActive", checked)}
                              data-testid="switch-popup-active"
                            />
                            <Label>Popup Ativo</Label>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={createPopupMutation.isPending}
                          data-testid="button-save-popup"
                        >
                          {createPopupMutation.isPending ? "Salvando..." : "Salvar Popup"}
                        </Button>
                      </form>
                    )}

                    {/* Notification Form */}
                    {activeTab === 'notifications' && (
                      <form onSubmit={notificationForm.handleSubmit((data) => createNotificationMutation.mutate(data))} className="space-y-4">
                        <div>
                          <Label htmlFor="notification-title">Título <span className="text-destructive">*</span></Label>
                          <Input
                            id="notification-title"
                            {...notificationForm.register("title")}
                            placeholder="Digite o título da notificação"
                            data-testid="input-notification-title"
                          />
                          {notificationForm.formState.errors.title && (
                            <p className="text-sm text-destructive mt-1">{notificationForm.formState.errors.title.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="notification-description">Descrição <span className="text-destructive">*</span></Label>
                          <Textarea
                            id="notification-description"
                            {...notificationForm.register("description")}
                            placeholder="Descrição da notificação"
                            data-testid="textarea-notification-description"
                          />
                          {notificationForm.formState.errors.description && (
                            <p className="text-sm text-destructive mt-1">{notificationForm.formState.errors.description.message}</p>
                          )}
                        </div>

                        <ImageUpload
                          id="notification-image"
                          label="Imagem da Notificação"
                          value={notificationForm.watch("imageUrl")}
                          onChange={(base64) => notificationForm.setValue("imageUrl", base64)}
                          placeholder="Selecionar imagem da notificação"
                        />

                        <div>
                          <Label htmlFor="notification-link">URL de Destino</Label>
                          <Input
                            id="notification-link"
                            {...notificationForm.register("linkUrl")}
                            placeholder="https://exemplo.com/destino"
                            data-testid="input-notification-link"
                          />
                        </div>

                        <div>
                          <Label htmlFor="notification-audience">Público-Alvo</Label>
                          <Select
                            value={notificationForm.watch("targetAudience")}
                            onValueChange={(value) => notificationForm.setValue("targetAudience", value)}
                          >
                            <SelectTrigger data-testid="select-notification-audience">
                              <SelectValue placeholder="Selecione o público-alvo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os usuários</SelectItem>
                              <SelectItem value="free">Usuários gratuitos</SelectItem>
                              <SelectItem value="premium">Usuários premium</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Campos de Data e Hora para Agendamento */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="notification-start-datetime">Data/Hora Inicial</Label>
                            <Input
                              id="notification-start-datetime"
                              type="datetime-local"
                              {...notificationForm.register("startDateTime")}
                              onKeyDown={(e) => {
                                if (e.key === 'Delete') {
                                  e.preventDefault();
                                  notificationForm.setValue("startDateTime", "");
                                }
                              }}
                              data-testid="input-notification-start-datetime"
                            />
                          </div>

                          <div>
                            <Label htmlFor="notification-end-datetime">Data/Hora Final</Label>
                            <Input
                              id="notification-end-datetime"
                              type="datetime-local"
                              {...notificationForm.register("endDateTime")}
                              onKeyDown={(e) => {
                                if (e.key === 'Delete') {
                                  e.preventDefault();
                                  notificationForm.setValue("endDateTime", "");
                                }
                              }}
                              data-testid="input-notification-end-datetime"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={notificationForm.watch("isActive") || false}
                            onCheckedChange={(checked) => notificationForm.setValue("isActive", checked)}
                            data-testid="switch-notification-active"
                          />
                          <Label>Notificação Ativa</Label>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={createNotificationMutation.isPending}
                          data-testid="button-save-notification"
                        >
                          {createNotificationMutation.isPending ? "Salvando..." : "Salvar Notificação"}
                        </Button>
                      </form>
                    )}

                    {/* Category Form */}
                    {activeTab === 'categories' && (
                      <form onSubmit={categoryForm.handleSubmit((data) => createCategoryMutation.mutate(data))} className="space-y-4">
                        <div>
                          <Label htmlFor="category-title">Título <span className="text-destructive">*</span></Label>
                          <Input
                            id="category-title"
                            {...categoryForm.register("title")}
                            placeholder="Digite o título da categoria"
                            data-testid="input-category-title"
                          />
                          {categoryForm.formState.errors.title && (
                            <p className="text-sm text-destructive mt-1">{categoryForm.formState.errors.title.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="category-description">Descrição</Label>
                          <Textarea
                            id="category-description"
                            {...categoryForm.register("description")}
                            placeholder="Descrição da categoria"
                            data-testid="textarea-category-description"
                          />
                        </div>

                        <ImageUpload
                          id="category-cover-image"
                          label="Imagem de Capa da Categoria"
                          value={categoryForm.watch("coverImageUrl")}
                          onChange={(base64) => categoryForm.setValue("coverImageUrl", base64)}
                          placeholder="Selecionar imagem de capa"
                        />

                        <div>
                          <Label htmlFor="category-order">Ordem de Exibição</Label>
                          <Input
                            id="category-order"
                            type="number"
                            {...categoryForm.register("order", { valueAsNumber: true })}
                            placeholder="0"
                            data-testid="input-category-order"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={categoryForm.watch("isActive") ?? true}
                            onCheckedChange={(checked) => {
                              categoryForm.setValue("isActive", checked);
                              categoryForm.trigger("isActive");
                            }}
                            data-testid="switch-category-active"
                          />
                          <Label htmlFor="switch-category-active">Categoria Ativa</Label>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={createCategoryMutation.isPending || reorganizeCategoryMutation.isPending}
                          data-testid="button-save-category"
                        >
                          {reorganizeCategoryMutation.isPending ? "Reorganizando..." : createCategoryMutation.isPending ? "Salvando..." : "Salvar Categoria"}
                        </Button>
                      </form>
                    )}
                  </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Videos Tab */}
              <TabsContent value="videos">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 mb-4">
                      <Play className="w-5 h-5" />
                      Gerenciar Vídeos
                    </CardTitle>

                    {/* Campo de Pesquisa */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Pesquisar vídeos por título ou descrição..."
                        value={videoSearchTerm}
                        onChange={(e) => setVideoSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {videosLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: videoItemsPerPage }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Skeleton className="h-16 w-24 rounded" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <div className="flex space-x-2">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredAndPaginatedVideos.items.length > 0 ? (
                      <>
                        <div className="space-y-4">
                          {filteredAndPaginatedVideos.items.map((video) => (
                            <div key={video.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                              <div className="w-24 h-16 bg-muted rounded overflow-hidden relative">
                                {video.thumbnailUrl ? (
                                  <img
                                    src={video.thumbnailUrl}
                                    alt={video.title}
                                    className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                                    onLoad={(e) => {
                                      e.currentTarget.classList.remove('opacity-0');
                                      e.currentTarget.classList.add('opacity-100');
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (nextElement) {
                                        nextElement.classList.remove('hidden');
                                      }
                                    }}
                                  />
                                ) : null}
                                <div className={`absolute inset-0 flex items-center justify-center ${video.thumbnailUrl ? 'hidden' : ''}`}>
                                  <Play className="w-6 h-6 text-muted-foreground" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground" data-testid={`video-title-${video.id}`}>
                                  {video.title}
                                </h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{video.description}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  {video.type === 'playlist' ? (
                                    <Badge className="bg-orange-100 text-orange-700">Playlist</Badge>
                                  ) : video.type === 'live' ? (
                                    <Badge className="bg-red-100 text-red-700">Live</Badge>
                                  ) : (
                                    <Badge className="bg-blue-100 text-blue-700">Vídeo</Badge>
                                  )}
                                  {video.isExclusive && (
                                    <Badge className="bg-purple-500/10 text-purple-700">Exclusivo</Badge>
                                  )}
                                  {video.category && (
                                    <Badge variant="outline">{getCategoryLabel(video.category)}</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(video, 'videos')}
                                  data-testid={`button-edit-video-${video.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(video.id, 'videos', video.title)}
                                  data-testid={`button-delete-video-${video.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Play className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum vídeo encontrado</h3>
                        <p className="text-muted-foreground mb-4">
                          {videoSearchTerm 
                            ? `Não encontramos vídeos com "${videoSearchTerm}"`
                            : "Crie seu primeiro vídeo para começar"}
                        </p>
                        {!videoSearchTerm && (
                          <Button onClick={() => openCreateDialog('videos')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Primeiro Vídeo
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Controles de Paginação */}
                    {!videosLoading && filteredAndPaginatedVideos.items.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Mostrar:</span>
                            <Select value={videoItemsPerPage.toString()} onValueChange={(value) => setVideoItemsPerPage(Number(value))}>
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground">por página</span>
                          </div>


                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVideoCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={videoCurrentPage <= 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Anterior
                          </Button>

                          <div className="text-sm text-muted-foreground px-3">
                            {videoCurrentPage}/{filteredAndPaginatedVideos.totalPages}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVideoCurrentPage(prev => Math.min(filteredAndPaginatedVideos.totalPages, prev + 1))}
                            disabled={videoCurrentPage >= filteredAndPaginatedVideos.totalPages}
                          >
                            Próximo
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 mb-4">
                      <Download className="w-5 h-5" />
                      Gerenciar Produtos
                    </CardTitle>

                    {/* Campo de Pesquisa */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Pesquisar produtos por título ou descrição..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {productsLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: productItemsPerPage }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Skeleton className="h-16 w-16 rounded" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <div className="flex space-x-2">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredAndPaginatedProducts.items.length > 0 ? (
                      <>
                        <div className="space-y-4">
                          {filteredAndPaginatedProducts.items.map((product) => (
                            <div key={product.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                              <div className="w-16 h-16 bg-muted rounded overflow-hidden relative">
                                {product.coverImageUrl ? (
                                  <img
                                    src={product.coverImageUrl}
                                    alt={product.title}
                                    className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                                    onLoad={(e) => {
                                      e.currentTarget.classList.remove('opacity-0');
                                      e.currentTarget.classList.add('opacity-100');
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (nextElement) {
                                        nextElement.classList.remove('hidden');
                                      }
                                    }}
                                  />
                                ) : null}
                                <div className={`absolute inset-0 flex items-center justify-center ${product.coverImageUrl ? 'hidden' : ''}`}>
                                  <Download className="w-6 h-6 text-muted-foreground" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground" data-testid={`product-title-${product.id}`}>
                                  {product.title}
                                </h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{product.description}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline">{getProductTypeLabel(product.type)}</Badge>
                                  {product.isExclusive && (
                                    <Badge className="bg-purple-500/10 text-purple-700">Exclusivo</Badge>
                                  )}
                                  {product.isActive ? (
                                    <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                                  ) : (
                                    <Badge variant="secondary">Inativo</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(product, 'products')}
                                  data-testid={`button-edit-product-${product.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(product.id, 'products', product.title)}
                                  data-testid={`button-delete-product-${product.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Download className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum produto encontrado</h3>
                        <p className="text-muted-foreground mb-4">
                          {productSearchTerm 
                            ? `Não encontramos produtos com "${productSearchTerm}"`
                            : "Crie seu primeiro produto digital para começar"}
                        </p>
                        {!productSearchTerm && (
                          <Button onClick={() => openCreateDialog('products')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Primeiro Produto
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Controles de Paginação */}
                    {!productsLoading && filteredAndPaginatedProducts.items.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Mostrar:</span>
                            <Select value={productItemsPerPage.toString()} onValueChange={(value) => setProductItemsPerPage(Number(value))}>
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground">por página</span>
                          </div>


                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProductCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={productCurrentPage <= 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Anterior
                          </Button>

                          <div className="text-sm text-muted-foreground px-3">
                            {productCurrentPage}/{filteredAndPaginatedProducts.totalPages}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProductCurrentPage(prev => Math.min(filteredAndPaginatedProducts.totalPages, prev + 1))}
                            disabled={productCurrentPage >= filteredAndPaginatedProducts.totalPages}
                          >
                            Próximo
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Coupons Tab */}
              <TabsContent value="coupons">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 mb-4">
                      <Tag className="w-5 h-5" />
                      Gerenciar Cupons
                    </CardTitle>

                    {/* Campo de Pesquisa */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Pesquisar cupons por marca, código ou descrição..."
                        value={couponSearchTerm}
                        onChange={(e) => setCouponSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {couponsLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: couponItemsPerPage }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Skeleton className="h-16 w-16 rounded" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <div className="flex space-x-2">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredAndPaginatedCoupons.items.length > 0 ? (
                      <>
                        <div className="space-y-4">
                          {filteredAndPaginatedCoupons.items.map((coupon) => (
                            <div key={coupon.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                              <div className="w-16 h-16 bg-muted rounded overflow-hidden relative flex items-center justify-center">
                                {coupon.coverImageUrl ? (
                                  <img
                                    src={coupon.coverImageUrl}
                                    alt={coupon.brand}
                                    className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                                    onLoad={(e) => {
                                      e.currentTarget.classList.remove('opacity-0');
                                      e.currentTarget.classList.add('opacity-100');
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (nextElement) {
                                        nextElement.classList.remove('hidden');
                                      }
                                    }}
                                  />
                                ) : null}
                                <div className={`${coupon.coverImageUrl ? 'hidden' : ''}`}>
                                  <Tag className="w-6 h-6 text-muted-foreground" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-semibold text-foreground" data-testid={`coupon-brand-${coupon.id}`}>
                                    {coupon.brand}
                                  </h4>
                                  <Badge className="bg-primary/10 text-primary">{coupon.discount}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{coupon.description}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    Posição: {coupon.order}
                                  </Badge>
                                  <code className="text-xs bg-muted px-2 py-1 rounded">{coupon.code}</code>
                                  {coupon.category && (
                                    <Badge variant="outline">{getCategoryLabel(coupon.category)}</Badge>
                                  )}
                                  {coupon.isExclusive && (
                                    <Badge className="bg-purple-500/10 text-purple-700">Exclusivo</Badge>
                                  )}
                                  {(() => {
                                    const now = new Date();

                                    // Função para interpretar data como horário local brasileiro, não UTC
                                    const parseLocalDate = (dateString: string) => {
                                      if (!dateString) return null;

                                      // Forçar interpretação como horário local
                                      if (dateString.includes('T')) {
                                        const [datePart, timePart] = dateString.split('T');
                                        const [year, month, day] = datePart.split('-').map(Number);
                                        const [hour, minute] = timePart.split(':').map(Number);

                                        // Criar data usando horário local (não UTC)
                                        return new Date(year, month - 1, day, hour, minute);
                                      }
                                      return new Date(dateString);
                                    };

                                    const startDate = parseLocalDate(coupon.startDateTime);
                                    const endDate = parseLocalDate(coupon.endDateTime);

                                    // Se tem programação de data/hora
                                    if (startDate || endDate) {
                                      if (endDate && now > endDate) {
                                        return <Badge className="bg-gray-100 text-gray-700">Expirado</Badge>;
                                      } else if (startDate && now < startDate) {
                                        return <Badge className="bg-orange-100 text-orange-700">Programado</Badge>;
                                      } else if (coupon.isActive && 
                                                (!startDate || now >= startDate) && 
                                                (!endDate || now <= endDate)) {
                                        return <Badge className="bg-blue-100 text-blue-700">Em Vinculação</Badge>;
                                      }
                                    }

                                    // Status padrão baseado em isActive
                                    return coupon.isActive ? (
                                      <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                                    ) : (
                                      <Badge variant="secondary">Inativo</Badge>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(coupon, 'coupons')}
                                  disabled={isDeletingItem || isCreatingItem}
                                  data-testid={`button-edit-coupon-${coupon.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(coupon.id, 'coupons', coupon.brand)}
                                  disabled={isDeletingItem || isCreatingItem}
                                  data-testid={`button-delete-coupon-${coupon.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Controles de Paginação */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Mostrar:</span>
                              <Select value={couponItemsPerPage.toString()} onValueChange={(value) => setCouponItemsPerPage(Number(value))}>
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground">por página</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCouponCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={couponCurrentPage <= 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Anterior
                            </Button>

                            <div className="text-sm text-muted-foreground px-3">
                              {couponCurrentPage}/{filteredAndPaginatedCoupons.totalPages}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCouponCurrentPage(prev => Math.min(filteredAndPaginatedCoupons.totalPages, prev + 1))}
                              disabled={couponCurrentPage >= filteredAndPaginatedCoupons.totalPages}
                            >
                              Próximo
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Tag className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum cupom encontrado</h3>
                        <p className="text-muted-foreground mb-4">
                          {couponSearchTerm 
                            ? `Não encontramos cupons com "${couponSearchTerm}"`
                            : "Crie seu primeiro cupom de desconto para começar"}
                        </p>
                        {!couponSearchTerm && (
                          <Button onClick={() => openCreateDialog('coupons')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Primeiro Cupom
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Banners Tab */}
              <TabsContent value="banners">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 mb-4">
                      <Image className="w-5 h-5" />
                      Gerenciar Banners
                    </CardTitle>

                    {/* Campo de Pesquisa */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Pesquisar banners por título ou descrição..."
                        value={bannerSearchTerm}
                        onChange={(e) => setBannerSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {bannersLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: bannerItemsPerPage }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Skeleton className="h-16 w-24 rounded" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <div className="flex space-x-2">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredAndPaginatedBanners.items.length > 0 ? (
                      <>
                        <div className="space-y-4">
                          {filteredAndPaginatedBanners.items.map((banner) => (
                            <div key={banner.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                              <div className="w-24 h-16 bg-muted rounded overflow-hidden relative">
                                {banner.imageUrl ? (
                                  <img
                                    src={banner.imageUrl}
                                    alt={banner.title}
                                    className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                                    onLoad={(e) => {
                                      e.currentTarget.classList.remove('opacity-0');
                                      e.currentTarget.classList.add('opacity-100');
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (nextElement) {
                                        nextElement.classList.remove('hidden');
                                      }
                                    }}
                                  />
                                ) : null}
                                <div className={`absolute inset-0 flex items-center justify-center ${banner.imageUrl ? 'hidden' : ''}`}>
                                  <Image className="w-6 h-6 text-muted-foreground" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground" data-testid={`banner-title-${banner.id}`}>
                                  {banner.title}
                                </h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{banner.description}</p>
                                <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:flex-wrap">
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                      {banner.page === 'home' ? 'Página Inicial' : 
                                       banner.page === 'videos' ? 'Vídeos Exclusivos' :
                                       banner.page === 'products' ? 'Produtos Digitais' :
                                       banner.page === 'coupons' ? 'Cupons' :
                                       banner.page === 'community' ? 'Comunidade' :
                                       banner.page === 'profile' ? 'Perfil' :
                                       banner.page === 'video_specific' ? 'Vídeo Específico' :
                                       banner.page === 'course_specific' ? 'Curso Específico' :
                                       banner.page === 'bio' ? 'Bio' : banner.page}
                                    </Badge>
                                    {banner.displayOn === 'desktop' && (
                                      <Badge variant="outline" className="bg-slate-100 text-slate-700">
                                        🖥️ Desktop
                                      </Badge>
                                    )}
                                    {banner.displayOn === 'mobile' && (
                                      <Badge variant="outline" className="bg-slate-100 text-slate-700">
                                        📱 Mobile
                                      </Badge>
                                    )}
                                    {banner.displayOn === 'both' && (
                                      <Badge variant="outline" className="bg-slate-100 text-slate-700">
                                        🖥️📱 Ambos
                                      </Badge>
                                    )}
                                    {banner.page === 'video_specific' && banner.videoId && (
                                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                        ID: {banner.videoId.substring(0, 8)}...
                                      </Badge>
                                    )}
                                    {banner.page === 'course_specific' && banner.courseId && (
                                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                        ID: {banner.courseId.substring(0, 8)}...
                                      </Badge>
                                    )}
                                    {banner.isExclusive && (
                                      <Badge className="bg-purple-100 text-purple-700">
                                        Premium
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(banner, 'banners')}
                                  disabled={isDeletingItem || isCreatingItem}
                                  data-testid={`button-edit-banner-${banner.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(banner.id, 'banners', banner.title)}
                                  disabled={isDeletingItem || isCreatingItem}
                                  data-testid={`button-delete-banner-${banner.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Controles de Paginação */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Mostrar:</span>
                              <Select value={bannerItemsPerPage.toString()} onValueChange={(value) => setBannerItemsPerPage(Number(value))}>
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground">por página</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBannerCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={bannerCurrentPage <= 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Anterior
                            </Button>

                            <div className="text-sm text-muted-foreground px-3">
                              {bannerCurrentPage}/{filteredAndPaginatedBanners.totalPages}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBannerCurrentPage(prev => Math.min(filteredAndPaginatedBanners.totalPages, prev + 1))}
                              disabled={bannerCurrentPage >= filteredAndPaginatedBanners.totalPages}
                            >
                              Próximo
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <Image className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum banner encontrado</h3>
                        <p className="text-muted-foreground mb-4">
                          {bannerSearchTerm 
                            ? `Não encontramos banners com "${bannerSearchTerm}"`
                            : "Crie seu primeiro banner promocional para começar"}
                        </p>
                        {!bannerSearchTerm && (
                          <Button onClick={() => openCreateDialog('banners')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Primeiro Banner
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Popups Tab */}
              <TabsContent value="popups">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                      Gerenciar Popups
                    </CardTitle>

                    {/* Campo de Pesquisa */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Pesquisar popups por título ou descrição..."
                        value={popupSearchTerm}
                        onChange={(e) => setPopupSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {popupsLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: popupItemsPerPage }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Skeleton className="h-16 w-24 rounded" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <div className="flex space-x-2">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredAndPaginatedPopups.items.length > 0 ? (
                      <>
                        <div className="space-y-4">
                          {filteredAndPaginatedPopups.items.map((popup) => (
                            <div key={popup.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                              <div className="w-24 h-16 bg-muted rounded overflow-hidden relative">
                                {popup.imageUrl ? (
                                  <img
                                    src={popup.imageUrl}
                                    alt={popup.title}
                                    className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                                    onLoad={(e) => {
                                      e.currentTarget.classList.remove('opacity-0');
                                      e.currentTarget.classList.add('opacity-100');
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (nextElement) {
                                        nextElement.classList.remove('hidden');
                                      }
                                    }}
                                  />
                                ) : null}
                                <div className={`absolute inset-0 flex items-center justify-center ${popup.imageUrl ? 'hidden' : ''}`}>
                                  <div className="w-6 h-6 text-muted-foreground">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                      <circle cx="8.5" cy="8.5" r="1.5"/>
                                      <path d="M21 15l-5-5L5 21"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground" data-testid={`popup-title-${popup.id}`}>
                                  {popup.title}
                                </h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{popup.description}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    {popup.trigger === 'login' ? 'Login' :
                                     popup.trigger === 'logout' ? 'Logout' :
                                     popup.trigger === 'page_specific' ? 'Página Específica' :
                                     popup.trigger === 'scheduled' ? 'Agendado' : popup.trigger}
                                  </Badge>
                                  {popup.trigger === 'page_specific' && popup.targetPage && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                      {popup.targetPage === 'home' ? 'Home' :
                                       popup.targetPage === 'videos' ? 'Vídeos' :
                                       popup.targetPage === 'products' ? 'Produtos' :
                                       popup.targetPage === 'coupons' ? 'Cupons' :
                                       popup.targetPage === 'community' ? 'Comunidade' :
                                       popup.targetPage === 'profile' ? 'Perfil' :
                                       popup.targetPage === 'video_specific' ? 'Vídeo Específico' :
                                       popup.targetPage === 'course_specific' ? 'Curso Específico' : popup.targetPage}
                                    </Badge>
                                  )}
                                  {popup.targetPage === 'video_specific' && popup.targetVideoId && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                      ID: {popup.targetVideoId.substring(0, 8)}...
                                    </Badge>
                                  )}
                                  {popup.targetPage === 'course_specific' && popup.targetCourseId && ( // Adicionado para curso específico
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700">
                                      Curso ID: {popup.targetCourseId.substring(0, 8)}...
                                    </Badge>
                                  )}
                                  {popup.showFrequency === 'once_per_session' && (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Uma vez/sessão</Badge>
                                  )}
                                  {popup.isExclusive && (
                                    <Badge className="bg-purple-100 text-purple-700">Premium</Badge>
                                  )}
                                  {(() => {
                                    const now = new Date();

                                    // Função para interpretar data como horário local brasileiro, não UTC
                                    const parseLocalDate = (dateString: string) => {
                                      if (!dateString) return null;

                                      // Forçar interpretação como horário local
                                      if (dateString.includes('T')) {
                                        const [datePart, timePart] = dateString.split('T');
                                        const [year, month, day] = datePart.split('-').map(Number);
                                        const [hour, minute] = timePart.split(':').map(Number);

                                        // Criar data usando horário local (não UTC)
                                        return new Date(year, month - 1, day, hour, minute);
                                      }
                                      return new Date(dateString);
                                    };

                                    const startDate = parseLocalDate(popup.startDateTime);
                                    const endDate = parseLocalDate(popup.endDateTime);

                                    if (startDate || endDate) {
                                      if (endDate && now > endDate) {
                                        return <Badge className="bg-gray-100 text-gray-700">Expirado</Badge>;
                                      } else if (startDate && now < startDate) {
                                        return <Badge className="bg-orange-100 text-orange-700">Programado</Badge>;
                                      } else if (popup.isActive && 
                                                (!startDate || now >= startDate) && 
                                                (!endDate || now <= endDate)) {
                                        return <Badge className="bg-blue-100 text-blue-700">Em Vinculação</Badge>;
                                      }
                                    }

                                    return popup.isActive ? (
                                      <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                                    ) : (
                                      <Badge variant="secondary">Inativo</Badge>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(popup, 'popups')}
                                  data-testid={`button-edit-popup-${popup.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(popup.id, 'popups', popup.title)}
                                  data-testid={`button-delete-popup-${popup.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Controles de Paginação */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Mostrar:</span>
                              <Select value={popupItemsPerPage.toString()} onValueChange={(value) => setPopupItemsPerPage(Number(value))}>
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground">por página</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPopupCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={popupCurrentPage <= 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Anterior
                            </Button>

                            <div className="text-sm text-muted-foreground px-3">
                              {popupCurrentPage}/{filteredAndPaginatedPopups.totalPages}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPopupCurrentPage(prev => Math.min(filteredAndPaginatedPopups.totalPages, prev + 1))}
                              disabled={popupCurrentPage >= filteredAndPaginatedPopups.totalPages}
                            >
                              Próximo
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="w-8 h-8 text-muted-foreground">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <path d="M21 15l-5-5L5 21"/>
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum popup encontrado</h3>
                        <p className="text-muted-foreground mb-4">
                          {popupSearchTerm 
                            ? `Não encontramos popups com "${popupSearchTerm}"`
                            : "Crie seu primeiro popup para engajar os usuários"}
                        </p>
                        {!popupSearchTerm && (
                          <Button onClick={() => openCreateDialog('popups')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Primeiro Popup
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5" />
                      Gerenciar Usuários
                    </CardTitle>

                    {/* Controles de Pesquisa e Filtros */}
                    <div className="space-y-4">
                      {/* Pesquisa e Filtros na mesma linha */}
                      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                        {/* Campo de Pesquisa */}
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder="Pesquisar por nome ou email..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>

                        {/* Filtros */}
                        <div className="flex flex-wrap gap-2 items-center">
                          <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
                          </div>

                          <Select value={userGenderFilter} onValueChange={setUserGenderFilter}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos Gêneros</SelectItem>
                              <SelectItem value="masculino">Masculino</SelectItem>
                              <SelectItem value="feminino">Feminino</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select value={userPlanFilter} onValueChange={setUserPlanFilter}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos Planos</SelectItem>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                    </div>
                  </CardHeader>
                  <CardContent>
                    {usersLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: userItemsPerPage }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredAndPaginatedUsers.users.length > 0 ? (
                      <>
                        {/* Lista de usuários */}
                        <div className="space-y-4">
                          {filteredAndPaginatedUsers.users.map((user) => (
                            <div key={user.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                              <div className="w-12 h-12 bg-muted rounded-full overflow-hidden relative flex items-center justify-center">
                                {user.avatar ? (
                                  <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Users className="w-6 h-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">{user.name}</h4>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <p><strong>Email:</strong> {user.email}</p>
                                  {user.gender && <p><strong>Sexo:</strong> {user.gender === 'masculino' ? 'Masculino' : user.gender === 'feminino' ? 'Feminino' : user.gender === 'outro' ? 'Outro' : user.gender}</p>}
                                  {user.age && <p><strong>Idade:</strong> {user.age} anos</p>}
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="secondary" className="text-xs">
                                      Cadastrado em {new Date(user.createdAt!).toLocaleDateString('pt-BR')}
                                    </Badge>
                                    <Badge 
                                      variant={(user.planType || 'free') === 'premium' ? 'default' : 'outline'} 
                                      className={`text-xs ${(user.planType || 'free') === 'premium' ? 'bg-yellow-500 text-white' : 'border-gray-300 text-gray-600'}`}
                                    >
                                      {(user.planType || 'free') === 'premium' ? 'Premium' : 'Free'}
                                    </Badge>
                                    {user.isAdmin && (
                                      <Badge variant="destructive" className="text-xs">
                                        Admin
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          {userSearchTerm || userGenderFilter !== "all" || userPlanFilter !== "all" 
                            ? "Nenhum usuário encontrado com os filtros aplicados" 
                            : "Nenhum usuário cadastrado"}
                        </p>
                      </div>
                    )}

                    {/* Controles de Paginação - Sempre abaixo da lista */}
                    {!usersLoading && filteredAndPaginatedUsers.users.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t">
                        {/* Controle de itens por página e informações de resultado */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Mostrar:</span>
                            <Select value={userItemsPerPage.toString()} onValueChange={(value) => setUserItemsPerPage(Number(value))}>
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground">por página</span>
                          </div>


                        </div>

                        {/* Navegação de páginas - sempre visível */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUserCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={userCurrentPage <= 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Anterior
                          </Button>

                          <div className="text-sm text-muted-foreground px-3">
                            {userCurrentPage}/{filteredAndPaginatedUsers.totalPages}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUserCurrentPage(prev => Math.min(filteredAndPaginatedUsers.totalPages, prev + 1))}
                            disabled={userCurrentPage >= filteredAndPaginatedUsers.totalPages}
                          >
                            Próximo
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 mb-4">
                      <div className="w-5 h-5 text-purple-500 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                      </div>
                      Gerenciar Notificações
                    </CardTitle>

                    {/* Campo de Pesquisa */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Pesquisar notificações por título ou descrição..."
                        value={notificationSearchTerm}
                        onChange={(e) => setNotificationSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {notificationsLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: notificationItemsPerPage }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Skeleton className="h-16 w-24 rounded" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <div className="flex space-x-2">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredAndPaginatedNotifications.items.length > 0 ? (
                      <>
                        <div className="space-y-4">
                          {filteredAndPaginatedNotifications.items.map((notification) => (
                            <div key={notification.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                              <div className="w-24 h-16 bg-muted rounded overflow-hidden relative">
                                {notification.imageUrl ? (
                                  <img
                                    src={notification.imageUrl}
                                    alt={notification.title}
                                    className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                                    onLoad={(e) => {
                                      e.currentTarget.classList.remove('opacity-0');
                                      e.currentTarget.classList.add('opacity-100');
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (nextElement) {
                                        nextElement.classList.remove('hidden');
                                      }
                                    }}
                                  />
                                ) : null}
                                <div className={`absolute inset-0 flex items-center justify-center ${notification.imageUrl ? 'hidden' : ''}`}>
                                  <div className="w-6 h-6 text-muted-foreground">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground" data-testid={`notification-title-${notification.id}`}>
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{notification.description}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    {notification.targetAudience === 'all' ? 'Todos' : 
                                     notification.targetAudience === 'free' ? 'Gratuitos' : 'Premium'}
                                  </Badge>
                                  {(() => {
                                    const now = new Date();

                                    // Função para interpretar data como horário local brasileiro, não UTC
                                    const parseLocalDate = (dateString: string) => {
                                      if (!dateString) return null;

                                      // Forçar interpretação como horário local
                                      if (dateString.includes('T')) {
                                        const [datePart, timePart] = dateString.split('T');
                                        const [year, month, day] = datePart.split('-').map(Number);
                                        const [hour, minute] = timePart.split(':').map(Number);

                                        // Criar data usando horário local (não UTC)
                                        return new Date(year, month - 1, day, hour, minute);
                                      }
                                      return new Date(dateString);
                                    };

                                    const startDate = parseLocalDate(notification.startDateTime);
                                    const endDate = parseLocalDate(notification.endDateTime);

                                    // Se tem programação de data/hora
                                    if (startDate || endDate) {
                                      if (endDate && now > endDate) {
                                        return <Badge className="bg-gray-100 text-gray-700">Expirada</Badge>;
                                      } else if (startDate && now < startDate) {
                                        return <Badge className="bg-orange-100 text-orange-700">Programada</Badge>;
                                      } else if (notification.isActive && 
                                                (!startDate || now >= startDate) && 
                                                (!endDate || now <= endDate)) {
                                        return <Badge className="bg-blue-100 text-blue-700">Em Vinculação</Badge>;
                                      }
                                    }

                                    // Status padrão baseado em isActive
                                    return notification.isActive ? (
                                      <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                                    ) : (
                                      <Badge variant="secondary">Inativa</Badge>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendNotificationMutation.mutate(notification.id)}
                                  disabled={sendNotificationMutation.isPending}
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                  data-testid={`button-send-notification-${notification.id}`}
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(notification, 'notifications')}
                                  data-testid={`button-edit-notification-${notification.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(notification.id, 'notifications', notification.title)}
                                  disabled={isDeletingItem} 
                                  data-testid={`button-delete-notification-${notification.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Controles de Paginação */}
                        <div className="flex items-center justify-between mt-6">
                          <div className="flex items-center gap-4">
                            {/* Controle de itens por página */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Mostrar:</span>
                              <Select value={notificationItemsPerPage.toString()} onValueChange={(value) => setNotificationItemsPerPage(Number(value))}>
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground">por página</span>
                            </div>
                          </div>

                          {/* Navegação de páginas */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setNotificationCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={notificationCurrentPage <= 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Anterior
                            </Button>

                            <div className="text-sm text-muted-foreground px-3">
                              {notificationCurrentPage}/{filteredAndPaginatedNotifications.totalPages}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setNotificationCurrentPage(prev => Math.min(filteredAndPaginatedNotifications.totalPages, prev + 1))}
                              disabled={notificationCurrentPage >= filteredAndPaginatedNotifications.totalPages}
                            >
                              Próximo
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="w-8 h-8 text-muted-foreground">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma notificação encontrada</h3>
                        <p className="text-muted-foreground mb-4">
                          {notificationSearchTerm 
                            ? `Não encontramos notificações com "${notificationSearchTerm}"`
                            : "Crie sua primeira notificação para enviar aos usuários"
                          }
                        </p>
                        {!notificationSearchTerm && (
                          <Button onClick={() => openCreateDialog('notifications')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Primeira Notificação
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="categories">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 mb-4">
                      <div className="w-5 h-5 text-amber-500 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                          <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>
                          <line x1="8" y1="1" x2="8" y2="4"/>
                          <line x1="16" y1="1" x2="16" y2="4"/>
                        </svg>
                      </div>
                      Gerenciar Categorias
                    </CardTitle>

                    {/* Campo de Pesquisa */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Pesquisar categorias por título ou descrição..."
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {categoriesLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: categoryItemsPerPage }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Skeleton className="h-16 w-24 rounded" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <div className="flex space-x-2">
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredAndPaginatedCategories.items.length > 0 ? (
                      <>
                        <div className="space-y-4">
                          {filteredAndPaginatedCategories.items.map((category) => (
                            <div key={category.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                              <div className="w-24 h-16 bg-muted rounded overflow-hidden relative">
                                {category.coverImageUrl ? (
                                  <img
                                    src={category.coverImageUrl}
                                    alt={category.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-amber-100">
                                    <div className="w-6 h-6 text-amber-500">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                                        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>
                                        <line x1="8" y1="1" x2="8" y2="4"/>
                                        <line x1="16" y1="1" x2="16" y2="4"/>
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground" data-testid={`category-title-${category.id}`}>
                                  {category.title}
                                </h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{category.description}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    Posição: {category.order}
                                  </Badge>
                                  {category.isActive ? (
                                    <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                                  ) : (
                                    <Badge variant="secondary">Inativa</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(category, 'categories')}
                                  disabled={isDeletingItem || isCreatingItem}
                                  data-testid={`button-edit-category-${category.id}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(category.id, 'categories', category.title)}
                                  disabled={isDeletingItem || isCreatingItem}
                                  data-testid={`button-delete-category-${category.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Controles de Paginação */}
                        <div className="flex items-center justify-between mt-6">
                          <div className="flex items-center gap-4">
                            {/* Controle de itens por página */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Mostrar:</span>
                              <Select value={categoryItemsPerPage.toString()} onValueChange={(value) => setCategoryItemsPerPage(Number(value))}>
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground">por página</span>
                            </div>
                          </div>

                          {/* Navegação de páginas */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCategoryCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={categoryCurrentPage <= 1}
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Anterior
                            </Button>

                            <div className="text-sm text-muted-foreground px-3">
                              {categoryCurrentPage}/{filteredAndPaginatedCategories.totalPages}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCategoryCurrentPage(prev => Math.min(filteredAndPaginatedCategories.totalPages, prev + 1))}
                              disabled={categoryCurrentPage >= filteredAndPaginatedCategories.totalPages}
                            >
                              Próximo
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="w-8 h-8 text-muted-foreground">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>
                              <line x1="8" y1="1" x2="8" y2="4"/>
                              <line x1="16" y1="1" x2="16" y2="4"/>
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma categoria encontrada</h3>
                        <p className="text-muted-foreground mb-4">
                          {categorySearchTerm 
                            ? `Não encontramos categorias com "${categorySearchTerm}"`
                            : "Crie sua primeira categoria para organizar seus conteúdos"
                          }
                        </p>
                        {!categorySearchTerm && (
                          <Button onClick={() => openCreateDialog('categories')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Primeira Categoria
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
        </div>
      </main>

      {/* Modal de Confirmação para Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{itemToDelete?.title}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de conflito de ordem de cupons */}
      <AlertDialog open={showCouponConflictDialog} onOpenChange={setShowCouponConflictDialog}>
        <AlertDialogContent data-testid="dialog-order-conflict">
          <AlertDialogHeader>
            <AlertDialogTitle>Conflito de Ordem de Exibição</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um cupom cadastrado com a posição de exibição número {couponConflictData?.order}.
              {couponConflictData?.conflictCoupon && (
                <span className="block mt-2 font-medium">
                  Cupom atual: {couponConflictData.conflictCoupon.brand}
                </span>
              )}
              <span className="block mt-2">
                Ao confirmar, todos os cupons a partir da posição {couponConflictData?.order} serão incrementados em 1 posição para frente.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelCouponReorder}
              data-testid="button-cancel-reorder"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCouponReorder}
              data-testid="button-confirm-reorder"
            >
              Confirmar e Reordenar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de conflito de ordem de categorias */}
      <AlertDialog open={showCategoryConflictDialog} onOpenChange={setShowCategoryConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conflito de Posição</AlertDialogTitle>
            <AlertDialogDescription>
              A posição {pendingCategoryData?.order} já está ocupada pela categoria "{conflictingCategory?.title}".
              Deseja reorganizar automaticamente as categorias?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowCategoryConflictDialog(false);
                setPendingCategoryData(null);
                setConflictingCategory(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingCategoryData) {
                  reorganizeCategoryMutation.mutate(pendingCategoryData);
                }
              }}
              disabled={reorganizeCategoryMutation.isPending}
            >
              {reorganizeCategoryMutation.isPending ? "Reorganizando..." : "Reorganizar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de conflito de ordem de banners */}
      <AlertDialog open={showBannerConflictDialog} onOpenChange={setShowBannerConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conflito de Posição</AlertDialogTitle>
            <AlertDialogDescription>
              A posição {pendingBannerData?.order} já está ocupada pelo banner "{conflictingBanner?.title}" 
              {pendingBannerData?.page === 'video_specific' && pendingBannerData?.videoId 
                ? ` no vídeo selecionado` 
                : pendingBannerData?.page === 'course_specific' && pendingBannerData?.courseId // Adicionado para curso específico
                ? ` no curso selecionado`
                : ' na página selecionada'}.
              Deseja reorganizar automaticamente os banners?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowBannerConflictDialog(false);
                setPendingBannerData(null);
                setConflictingBanner(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingBannerData) {
                  reorganizeBannerMutation.mutate(pendingBannerData);
                }
              }}
              disabled={reorganizeBannerMutation.isPending}
            >
              {reorganizeBannerMutation.isPending ? "Reorganizando..." : "Reorganizar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}