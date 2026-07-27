<?php
// Wallet Handler - /api/app/wallet/:userId
$segments = getUrlSegments();
$userId = $segments[2] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') error('Method not allowed', 405);
if (!$userId) error('userId required');

$wallet = ensureWallet($userId);

success(['wallet' => [
    'id' => $wallet['id'],
    'userId' => $wallet['user_id'],
    'balance' => (float)$wallet['balance'],
    'earned' => (float)$wallet['earned'],
    'deposited' => (float)$wallet['deposited'],
    'withdrawn' => (float)$wallet['withdrawn'],
    'mainBalance' => (float)$wallet['main_balance'],
    'investmentBalance' => (float)$wallet['investment_balance'],
    'referralBalance' => (float)$wallet['referral_balance'],
    'bonusBalance' => (float)$wallet['bonus_balance'],
]]);
