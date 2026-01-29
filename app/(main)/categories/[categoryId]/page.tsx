export default function CategoryPage({ params }: { params: { slug: string } }) {
    return (
        <div>
            <h1>Category Page {params.slug}</h1>
        </div>
    );
}