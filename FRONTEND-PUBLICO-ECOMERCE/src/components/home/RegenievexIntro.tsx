import { HeartPulse, FlaskConical, Activity, Stethoscope, ArrowRight } from 'lucide-preact';
import { useNavigate } from 'react-router-dom';

export function RegenievexIntro() {
    const navigate = useNavigate();

    return (
        <section class="relative bg-white py-24 overflow-hidden">
            <div class="absolute inset-0 bg-slate-50/50"></div>

            {/* Decorative Gradients */}
            <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-100 rounded-full blur-3xl opacity-40 translate-x-1/3 -translate-y-1/3"></div>
            <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100 rounded-full blur-3xl opacity-40 -translate-x-1/3 translate-y-1/3"></div>

            <div class="max-w-[1400px] mx-auto px-6 relative z-10">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Text Content */}
                    <div class="max-w-xl">
                        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 mb-6">
                            <HeartPulse size={16} class="text-brand-600" />
                            <span class="text-sm font-bold text-brand-700 uppercase tracking-widest">Excelencia Farmacéutica</span>
                        </div>

                        <h2 class="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-[1.1] mb-6">
                            Descubre <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-500">RegeNievex</span>
                        </h2>

                        <p class="text-lg text-slate-500 font-medium leading-relaxed mb-8">
                            RegeNievex es tu portal de confianza para acceder a los productos farmacéuticos y tratamientos más avanzados.
                            Desarrollado por la Clínica Nieves, combinamos la medicina de precisión con la comodidad de un comercio electrónico moderno,
                            garantizando calidad clínica y eficacia demostrada en cada pedido.
                        </p>

                        <div class="grid grid-cols-2 gap-6 mb-10">
                            <div class="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-brand-200 transition-colors">
                                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                                    <FlaskConical size={20} />
                                </div>
                                <div>
                                    <h4 class="font-bold text-slate-800 mb-1">Fórmulas Clínicas</h4>
                                    <p class="text-sm text-slate-500 font-medium">Bajo estricto control médico.</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-brand-200 transition-colors">
                                <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h4 class="font-bold text-slate-800 mb-1">Resultados Comprobados</h4>
                                    <p class="text-sm text-slate-500 font-medium">Alta eficacia terapéutica.</p>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => navigate('/tienda')} class="text-brand-600 font-bold hover:text-brand-700 transition-colors flex items-center gap-2 group">
                            Conoce nuestros productos médicos <ArrowRight size={18} class="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Aesthetic Image/Graphics Side */}
                    <div class="relative w-full h-[500px] lg:h-[600px] rounded-[32px] overflow-hidden shadow-2xl shadow-brand-500/10 border border-slate-200">
                        {/* Abstract Medical Image Representation */}
                        <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2000&auto=format&fit=crop" class="absolute inset-0 w-full h-full object-cover" alt="RegeNievex Ciencias Médicas" />

                        {/* Glassmorphism overlays */}
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>

                        {/* Floating Badge */}
                        <div class="absolute bottom-8 left-8 right-8 glass rounded-2xl p-6 flex items-center gap-6 transform hover:-translate-y-2 transition-transform duration-500">
                            <div class="w-16 h-16 rounded-full bg-white flex items-center justify-center text-brand-600 shrink-0 shadow-lg">
                                <Stethoscope size={32} />
                            </div>
                            <div>
                                <h3 class="text-xl font-bold text-slate-900 mb-1">Respaldado por Clínica Nieves</h3>
                                <p class="text-sm font-medium text-slate-600">Años de experiencia médica a tu servicio.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
