import HeroSection from "@/app/components/main/HeroSection";
import FeaturedCourses from "@/app/components/main/FeaturedCourses";
import Categories from "@/app/components/main/Categories";
import WhyChooseUs from "@/app/components/main/WhyChooseUs";
import Testimonials from "@/app/components/main/Testimonials";
import CTASection from "../components/main/CTASection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturedCourses />
      <Categories />
      <WhyChooseUs />
      <Testimonials />
      <CTASection />
    </>
  );
}
