import { useEffect } from 'preact/hooks';

interface SEOOptions {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
}

export function useSEO({ title, description, image, url }: SEOOptions) {
    useEffect(() => {

        if (title) {
            document.title = title;
            setMetaTag('property', 'og:title', title);
            setMetaTag('name', 'twitter:title', title);
        }

        if (description) {
            setMetaTag('name', 'description', description);
            setMetaTag('property', 'og:description', description);
            setMetaTag('name', 'twitter:description', description);
        }

        if (image) {
            setMetaTag('property', 'og:image', image);
            setMetaTag('name', 'twitter:image', image);
        }

        if (url) {
            setMetaTag('property', 'og:url', url);
        }

        // Optional: We do not restore tags here because React Router manages page navigation 
        // and subsequent pages will overwrite these or rely on default if not using useSEO.
        // In a SPA, it's often better to let the next component set its own SEO or revert manually.
    }, [title, description, image, url]);
}

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
    let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);

    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
    }

    element.setAttribute('content', content);
}
