-- =============================================
-- Roshan Digital - MySQL Database Schema
-- Compatible with InfinityFree MySQL
-- =============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+05:00";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `avatar` VARCHAR(500) DEFAULT NULL,
  `role` ENUM('user','admin') NOT NULL DEFAULT 'user',
  `referral_code` VARCHAR(20) NOT NULL,
  `referred_by` VARCHAR(20) DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `verified` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `uk_referral_code` (`referral_code`),
  INDEX `idx_referred_by` (`referred_by`),
  INDEX `idx_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- OTP TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `otps` (
  `id` VARCHAR(36) NOT NULL,
  `target` VARCHAR(255) NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `purpose` VARCHAR(50) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_target_purpose` (`target`, `purpose`),
  INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- LOGIN HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `login_history` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `device` VARCHAR(255) DEFAULT NULL,
  `ip` VARCHAR(50) DEFAULT NULL,
  `browser` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'success',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- POSTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `posts` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `content` TEXT NOT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  `type` VARCHAR(20) NOT NULL DEFAULT 'post',
  `pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_pinned` (`pinned`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- COMMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `comments` (
  `id` VARCHAR(36) NOT NULL,
  `post_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `parent_id` VARCHAR(36) DEFAULT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_post_id` (`post_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_parent_id` (`parent_id`),
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- LIKES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `likes` (
  `id` VARCHAR(36) NOT NULL,
  `post_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_post_user` (`post_id`, `user_id`),
  INDEX `idx_post_id` (`post_id`),
  INDEX `idx_user_id` (`user_id`),
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- WALLETS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `earned` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `deposited` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `withdrawn` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `main_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `investment_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `referral_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `bonus_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `reward` DECIMAL(10,2) NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `link` VARCHAR(500) DEFAULT NULL,
  `duration` INT NOT NULL DEFAULT 0,
  `require_visit` TINYINT(1) NOT NULL DEFAULT 0,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- USER TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `user_tasks` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `task_id` VARCHAR(36) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_task` (`user_id`, `task_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_task_id` (`task_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INVESTMENT PLANS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `investment_plans` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `daily_profit` DECIMAL(10,2) NOT NULL,
  `profit_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `profit_type` VARCHAR(20) NOT NULL DEFAULT 'fixed',
  `duration` INT NOT NULL,
  `duration_days` INT NOT NULL DEFAULT 30,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- USER INVESTMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `user_investments` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `plan_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `daily_profit` DECIMAL(10,2) NOT NULL,
  `start_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `end_date` DATETIME DEFAULT NULL,
  `total_profit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `days_passed` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_plan_id` (`plan_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`plan_id`) REFERENCES `investment_plans`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- DEPOSITS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `deposits` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `method` VARCHAR(50) NOT NULL,
  `account_name` VARCHAR(255) DEFAULT NULL,
  `account_number` VARCHAR(100) DEFAULT NULL,
  `screenshot` VARCHAR(500) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `admin_note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- WITHDRAWALS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `withdrawals` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `method` VARCHAR(50) NOT NULL,
  `account_name` VARCHAR(255) DEFAULT NULL,
  `account_number` VARCHAR(100) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `admin_note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- REFERRALS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `referrals` (
  `id` VARCHAR(36) NOT NULL,
  `referrer_id` VARCHAR(36) NOT NULL,
  `referred_id` VARCHAR(36) NOT NULL,
  `reward` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_referrer_id` (`referrer_id`),
  INDEX `idx_referred_id` (`referred_id`),
  FOREIGN KEY (`referrer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`referred_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(20) NOT NULL DEFAULT 'info',
  `read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_read` (`read`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `balance` DECIMAL(12,2) NOT NULL,
  `detail` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_type` (`type`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `settings` (
  `id` VARCHAR(36) NOT NULL,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SEED DEFAULT SETTINGS
-- =============================================
INSERT INTO `settings` (`id`, `setting_key`, `setting_value`) VALUES
('s1', 'maintenanceMode', 'false'),
('s2', 'minDeposit', '100'),
('s3', 'maxDeposit', '500000'),
('s4', 'minWithdrawal', '500'),
('s5', 'referralReward', '100'),
('s6', 'tasksEnabled', 'true'),
('s7', 'investmentsEnabled', 'true'),
('s8', 'depositsEnabled', 'true'),
('s9', 'withdrawalsEnabled', 'true'),
('s10', 'cronSecret', 'roshan-digital-cron-2024')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- =============================================
-- SEED DEFAULT INVESTMENT PLANS
-- daily_profit = amount × (profit_percentage / 100)
-- =============================================
INSERT INTO `investment_plans` (`id`, `name`, `description`, `amount`, `daily_profit`, `profit_percentage`, `profit_type`, `duration`, `duration_days`, `active`) VALUES
('p1', 'Starter Plan', 'Perfect for beginners. Low risk, steady returns.', 1000.00, 50.00, 5.00, 'percentage', 30, 30, 1),
('p2', 'Growth Plan', 'Steady returns for growing investors', 5000.00, 300.00, 6.00, 'percentage', 30, 30, 1),
('p3', 'Premium Plan', 'High returns for serious investors', 15000.00, 1000.00, 6.67, 'percentage', 30, 30, 1),
('p4', 'Elite Plan', 'Maximum returns for premium members', 50000.00, 4000.00, 8.00, 'percentage', 30, 30, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- =============================================
-- SEED DEFAULT TASKS
-- =============================================
INSERT INTO `tasks` (`id`, `title`, `description`, `reward`, `category`, `active`) VALUES
('t1', 'Download App', 'Our Download App Install', 50.00, 'app', 1),
('t2', 'Watch Video', 'Watch a short video and submit a screenshot', 25.00, 'video', 1),
('t3', 'Follow Social Media', 'Follow our social media accounts', 30.00, 'social', 1),
('t4', 'Write a Review', 'on Google Play or App Store Write a Review', 40.00, 'review', 1),
('t5', 'Refer a Friend', 'Invite a friend to join our platform', 60.00, 'referral', 1),
('t6', 'Visit Website', 'Visit our website for 5 minutes', 15.00, 'visit', 1)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- =============================================
-- UPDATES TABLE (Version Control)
-- =============================================
CREATE TABLE IF NOT EXISTS `updates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version` VARCHAR(20) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'completed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- BACKUP LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `backup_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `backup_name` VARCHAR(255) NOT NULL,
  `backup_path` VARCHAR(500) NOT NULL,
  `tables_included` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'success',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- MIGRATION LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS `migration_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `migration_file` VARCHAR(255) NOT NULL,
  `tables_affected` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'success',
  `error_message` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PROFIT HISTORY TABLE (Daily Profit Distribution)
-- =============================================
CREATE TABLE IF NOT EXISTS `profit_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `investment_id` VARCHAR(36) NOT NULL,
  `plan_name` VARCHAR(255) DEFAULT NULL,
  `profit_amount` DECIMAL(10,2) NOT NULL,
  `profit_date` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'distributed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_daily_profit` (`user_id`, `investment_id`, `profit_date`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_investment_id` (`investment_id`),
  INDEX `idx_profit_date` (`profit_date`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`investment_id`) REFERENCES `user_investments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SEED DEFAULT ADMIN USER
-- Admin email: admin@roshan.com
-- Admin password: admin123
-- =============================================
INSERT INTO `users` (`id`, `email`, `name`, `phone`, `password`, `role`, `referral_code`, `active`, `verified`, `created_at`) VALUES
('admin001', 'admin@roshan.com', 'Admin', NULL, 'admin123', 'admin', 'ADMIN001', 1, 1, NOW())
ON DUPLICATE KEY UPDATE `password` = VALUES(`password`);

COMMIT;
