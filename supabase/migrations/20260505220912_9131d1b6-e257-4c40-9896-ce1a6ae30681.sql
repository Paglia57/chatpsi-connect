-- Revoke EXECUTE on internal-only functions from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_subscription_activated() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_file_type(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Revoke anon EXECUTE on user/admin-facing SECURITY DEFINER functions (keep for authenticated)
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, text, text, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_clear_thread(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_referral(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_referral(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_referral_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_profile_basic_info(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_profile_basic_info(text, text, text) FROM PUBLIC, anon;