
const { Pool } = require('pg');

const railwayPool = new Pool({
  host: process.env.RAILWAY_DB_HOST,
  port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
  database: process.env.RAILWAY_DB_NAME,
  user: process.env.RAILWAY_DB_USER,
  password: process.env.RAILWAY_DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

const sqlStatements = [
  // Criar extensão para UUID
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
  
  // Users
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    cpf TEXT,
    avatar TEXT,
    gender TEXT,
    age INTEGER,
    community_title TEXT DEFAULT 'Nossa Comunidade',
    community_subtitle TEXT DEFAULT 'Compartilhe suas experiências e dicas de beleza',
    community_background_image TEXT,
    community_background_image_mobile TEXT,
    phone TEXT,
    zip_code TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    social_networks JSON DEFAULT '[]',
    is_admin BOOLEAN DEFAULT false,
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Subscriptions
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    plan_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Categories
  `CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Videos
  `CREATE TABLE IF NOT EXISTS videos (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'video',
    thumbnail_url TEXT,
    is_exclusive BOOLEAN DEFAULT false,
    category_id VARCHAR REFERENCES categories(id),
    duration TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Products
  `CREATE TABLE IF NOT EXISTS products (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    file_url TEXT,
    cover_image_url TEXT,
    category_id VARCHAR REFERENCES categories(id),
    is_exclusive BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Coupons
  `CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    description TEXT NOT NULL,
    discount TEXT NOT NULL,
    category_id VARCHAR REFERENCES categories(id),
    expiry_date TIMESTAMP,
    is_exclusive BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    store_url TEXT,
    cover_image_url TEXT,
    start_date_time TIMESTAMP,
    end_date_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Banners
  `CREATE TABLE IF NOT EXISTS banners (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    page TEXT NOT NULL DEFAULT 'home',
    video_id VARCHAR REFERENCES videos(id),
    is_active BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    show_title BOOLEAN NOT NULL DEFAULT true,
    show_description BOOLEAN NOT NULL DEFAULT true,
    show_button BOOLEAN NOT NULL DEFAULT true,
    start_date_time TIMESTAMP,
    end_date_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Posts
  `CREATE TABLE IF NOT EXISTS posts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    image_url TEXT,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Post Likes
  `CREATE TABLE IF NOT EXISTS post_likes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    post_id VARCHAR NOT NULL REFERENCES posts(id),
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Post Tags
  `CREATE TABLE IF NOT EXISTS post_tags (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id VARCHAR NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tagged_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Comments
  `CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    video_id VARCHAR REFERENCES videos(id),
    product_id VARCHAR REFERENCES products(id),
    post_id VARCHAR REFERENCES posts(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // User Activity
  `CREATE TABLE IF NOT EXISTS user_activity (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    resource_id VARCHAR,
    resource_type TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Video Likes
  `CREATE TABLE IF NOT EXISTS video_likes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    video_id VARCHAR NOT NULL REFERENCES videos(id),
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Popups
  `CREATE TABLE IF NOT EXISTS popups (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    trigger TEXT NOT NULL,
    target_page TEXT,
    target_video_id VARCHAR REFERENCES videos(id),
    target_course_id VARCHAR REFERENCES products(id),
    show_frequency TEXT NOT NULL DEFAULT 'always',
    show_title BOOLEAN DEFAULT true,
    show_description BOOLEAN DEFAULT true,
    show_button BOOLEAN DEFAULT true,
    is_exclusive BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    start_date_time TIMESTAMP,
    end_date_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Popup Views
  `CREATE TABLE IF NOT EXISTS popup_views (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    popup_id VARCHAR NOT NULL REFERENCES popups(id),
    session_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    target_audience TEXT NOT NULL DEFAULT 'all',
    is_active BOOLEAN DEFAULT true,
    start_date_time TIMESTAMP,
    end_date_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // User Notifications
  `CREATE TABLE IF NOT EXISTS user_notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    notification_id VARCHAR NOT NULL REFERENCES notifications(id),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, notification_id)
  );`,
  
  // Notification Settings
  `CREATE TABLE IF NOT EXISTS notification_settings (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
    email_enabled BOOLEAN DEFAULT true,
    whatsapp_enabled BOOLEAN DEFAULT false,
    sms_enabled BOOLEAN DEFAULT false,
    sound_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Share Settings
  `CREATE TABLE IF NOT EXISTS share_settings (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    free_referral_points INTEGER DEFAULT 25,
    premium_referral_points INTEGER DEFAULT 50,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR REFERENCES users(id)
  );`,
  
  // Referrals
  `CREATE TABLE IF NOT EXISTS referrals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id VARCHAR NOT NULL REFERENCES users(id),
    referred_id VARCHAR NOT NULL REFERENCES users(id),
    referral_code TEXT,
    points_awarded INTEGER DEFAULT 0,
    referred_plan_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // User Points
  `CREATE TABLE IF NOT EXISTS user_points (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    total_points INTEGER DEFAULT 0,
    current_level TEXT DEFAULT 'bronze',
    level_progress INTEGER DEFAULT 0,
    free_referrals INTEGER DEFAULT 0,
    premium_referrals INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Missions
  `CREATE TABLE IF NOT EXISTS missions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    points_reward INTEGER NOT NULL,
    mission_type TEXT NOT NULL,
    action_required TEXT NOT NULL,
    target_count INTEGER DEFAULT 1,
    icon TEXT DEFAULT 'star',
    color TEXT DEFAULT '#ff6b9d',
    min_level TEXT DEFAULT 'bronze',
    min_points INTEGER DEFAULT 0,
    premium_only BOOLEAN DEFAULT false,
    usage_limit INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // User Missions
  `CREATE TABLE IF NOT EXISTS user_missions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    mission_id VARCHAR NOT NULL REFERENCES missions(id),
    current_progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Rewards
  `CREATE TABLE IF NOT EXISTS rewards (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    points_cost INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    reward_value TEXT,
    image_url TEXT,
    stock_quantity INTEGER DEFAULT -1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // User Rewards
  `CREATE TABLE IF NOT EXISTS user_rewards (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    reward_id VARCHAR NOT NULL REFERENCES rewards(id),
    points_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'claimed',
    reward_data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Raffles
  `CREATE TABLE IF NOT EXISTS raffles (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    prize_description TEXT NOT NULL,
    image_url TEXT,
    entry_cost INTEGER DEFAULT 1,
    max_entries_per_user INTEGER DEFAULT 10,
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP NOT NULL,
    draw_date TIMESTAMP,
    winner_user_id VARCHAR REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    total_entries INTEGER DEFAULT 0,
    category TEXT DEFAULT 'Beleza',
    prize_value NUMERIC(10,2) DEFAULT 0,
    winner_count INTEGER DEFAULT 1,
    max_participants INTEGER DEFAULT 1000,
    min_points INTEGER DEFAULT 0,
    min_level TEXT DEFAULT 'bronze',
    premium_only BOOLEAN DEFAULT false,
    sponsor_name TEXT,
    sponsor_logo TEXT,
    rules TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Raffle Entries
  `CREATE TABLE IF NOT EXISTS raffle_entries (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    raffle_id VARCHAR NOT NULL REFERENCES raffles(id),
    entry_count INTEGER DEFAULT 1,
    points_spent INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Raffle Winners
  `CREATE TABLE IF NOT EXISTS raffle_winners (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id VARCHAR NOT NULL REFERENCES raffles(id),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    "position" INTEGER DEFAULT 1,
    prize_delivered BOOLEAN DEFAULT false,
    delivery_info TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // Achievements
  `CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT DEFAULT 'trophy',
    color TEXT DEFAULT '#ffd700',
    condition_type TEXT NOT NULL,
    condition_value INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );`,
  
  // User Achievements
  `CREATE TABLE IF NOT EXISTS user_achievements (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    achievement_id VARCHAR NOT NULL REFERENCES achievements(id),
    unlocked_at TIMESTAMP DEFAULT NOW()
  );`,
];

async function createTables() {
  console.log('🚀 Criando tabelas no Railway PostgreSQL...\n');
  
  try {
    console.log('📡 Testando conexão...');
    await railwayPool.query('SELECT NOW()');
    console.log('✅ Conectado ao Railway!\n');
    
    console.log('📊 Criando tabelas...\n');
    
    for (const sql of sqlStatements) {
      try {
        await railwayPool.query(sql);
        const tableName = sql.match(/CREATE (?:TABLE|EXTENSION) IF NOT EXISTS (?:")?(\w+)/)?.[1] || 'extension';
        console.log(`✅ ${tableName}`);
      } catch (error) {
        console.error(`❌ Erro:`, error.message);
      }
    }
    
    console.log('\n✅ Todas as tabelas foram criadas com sucesso!\n');
    
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

createTables().catch(console.error);
