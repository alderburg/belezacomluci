
-- Fix popup trigger typos
UPDATE popups SET trigger = 'logout' WHERE trigger = 'triuer';
UPDATE popups SET trigger = 'logout' WHERE trigger LIKE '%logout%' OR trigger LIKE '%triuer%' OR trigger LIKE '%logou%';
