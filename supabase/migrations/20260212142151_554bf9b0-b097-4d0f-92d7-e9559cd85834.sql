
CREATE OR REPLACE FUNCTION public.purge_all_billing_history(admin_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_bills integer;
  deleted_items integer;
  deleted_payments integer;
  deleted_print_jobs integer;
  deleted_cart_items integer;
  user_role text;
BEGIN
  -- Check role from users table (custom auth) OR user_roles table
  SELECT role INTO user_role FROM users WHERE id = admin_user_id AND is_active = true;
  
  IF user_role IS NULL OR (user_role != 'admin' AND NOT has_role(admin_user_id, 'admin')) THEN
    RAISE EXCEPTION 'Only admins can purge billing history';
  END IF;

  DELETE FROM payment_details;
  GET DIAGNOSTICS deleted_payments = ROW_COUNT;

  DELETE FROM bill_items;
  GET DIAGNOSTICS deleted_items = ROW_COUNT;

  DELETE FROM print_jobs;
  GET DIAGNOSTICS deleted_print_jobs = ROW_COUNT;

  DELETE FROM cart_items;
  GET DIAGNOSTICS deleted_cart_items = ROW_COUNT;

  DELETE FROM bills;
  GET DIAGNOSTICS deleted_bills = ROW_COUNT;

  ALTER SEQUENCE bill_number_seq RESTART WITH 1;
  ALTER SEQUENCE token_number_seq RESTART WITH 1;
  ALTER SEQUENCE kot_number_seq RESTART WITH 1;

  UPDATE tables SET status = 'available', current_bill_id = NULL, current_amount = NULL;

  RETURN json_build_object(
    'deleted_bills', deleted_bills,
    'deleted_items', deleted_items,
    'deleted_payments', deleted_payments,
    'deleted_print_jobs', deleted_print_jobs,
    'deleted_cart_items', deleted_cart_items,
    'performed_by', admin_user_id,
    'performed_at', now()
  );
END;
$$;
