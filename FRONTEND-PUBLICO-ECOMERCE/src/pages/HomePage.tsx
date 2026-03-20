import { HeroSection } from '../components/home/HeroSection';
import { RegenievexIntro } from '../components/home/RegenievexIntro';
import { FeatureHighlights } from '../components/home/FeatureHighlights';
//import { TrendingProducts } from '../components/home/TrendingProducts';
import { DynamicLandingSection } from '../components/DynamicLandingSection';
import { useLandingPage } from '../hooks/useLandingPage';

export function HomePage() {
    const { data: secciones, loading } = useLandingPage();

    return (
        <div class="w-full">
            <HeroSection />
            <FeatureHighlights />

            {/* Secciones Dinámicas del Servidor */}
            {!loading && secciones.map((section) => (
                <DynamicLandingSection
                    key={section.id}
                    titulo={section.titulo}
                    descripcion={section.descripcion}
                    productos={section.productos}
                />
            ))}

            <RegenievexIntro />
       
        </div>
    );
}
