import { useNavigate } from 'react-router-dom';

/** Navigates to a route with a single query param (e.g. search value). */
export function useNavigateSearch() {
  const navigate = useNavigate();
  return (to, value) => {
    const qs = value ? `?search=${encodeURIComponent(value)}` : '';
    navigate(`${to}${qs}`);
  };
}