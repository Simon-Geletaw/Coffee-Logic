type Product={
  id:number;
  name:string;
  roast:string;
  }

export default async function Home() {
 
  const res = await fetch("http://localhost:3000/health", {cache :'no-store'});
  const data = await res.json();
  const resproducts = await fetch("http://localhost:3000/products", {cache :'no-store'});
  const products:Product[] = await resproducts.json();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4">
          API Status: {data.status}
          
        </p>
      </div>
      <div>
        <ul>
            {products.map((product)=>
            <li key={product.id}>{product.name} - {product.roast}</li>)}
          </ul>
      </div>
    </main>
  );
 
}
  
