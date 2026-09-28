ALTER ROLE agora_backup WITH INHERIT BYPASSRLS;
GRANT pg_read_all_data TO agora_backup WITH INHERIT TRUE;
ALTER ROLE agora_backup SET default_transaction_read_only = on;
