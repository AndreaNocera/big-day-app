import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Use a small timeout to ensure the DOM has updated and
        // to override the browser's native scroll restoration on back/forward
        const timer = setTimeout(() => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'auto' // 'auto' bypasses 'scroll-behavior: smooth'
            });
        }, 0);

        return () => clearTimeout(timer);
    }, [pathname]);

    return null;
}
