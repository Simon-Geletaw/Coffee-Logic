type Product = {
  id: string;
  name: string;
  roast: string;
};

export default async function Home() {
  const healthRes = await fetch('http://localhost:3001/health', {
    cache: 'no-store',
  });

  if (!healthRes.ok) {
    throw new Error(`Health API failed: ${healthRes.status}`);
  }

  const health = await healthRes.json();

  const productsRes = await fetch('http://localhost:3001/products', {
    cache: 'no-store',
  });

  if (!productsRes.ok) {
    throw new Error(`Products API failed: ${productsRes.status}`);
  }

  const products: Product[] = await productsRes.json();

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-8">
      <div className="mb-6 rounded border p-4">
        API Status: {health.status}
      </div>
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Products</h1>
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              {product.name} - {product.roast}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

