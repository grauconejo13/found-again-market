import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const inventory = [
  { id: 1, title: 'The Secret Garden', category: 'Books', condition: 'Gently loved', price: 12, accent: 'moss', note: 'A well-kept classic with a little history in its pages.', tag: 'Cozy classic' },
  { id: 2, title: 'Ceramic Daisy Mug', category: 'Home', condition: 'Excellent', price: 9, accent: 'butter', note: 'Sunny mornings, already included.', tag: 'Morning ritual' },
  { id: 3, title: 'Woven Market Tote', category: 'Accessories', condition: 'Very good', price: 18, accent: 'clay', note: 'A sturdy, easygoing carryall for market days.', tag: 'Everyday find' },
  { id: 4, title: 'The Art of Simple Food', category: 'Books', condition: 'Gently loved', price: 14, accent: 'lilac', note: 'For slow dinners and notes in the margin.', tag: 'Kitchen shelf' },
  { id: 5, title: 'Brass Leaf Frame', category: 'Home', condition: 'Good', price: 11, accent: 'sky', note: 'A small frame looking for its next memory.', tag: 'Little treasure' },
  { id: 6, title: 'Canvas Field Jacket', category: 'Clothing', condition: 'Very good', price: 26, accent: 'olive', note: 'Broken in beautifully, ready for more walks.', tag: 'Second season' }
];

function App() {
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showSeller, setShowSeller] = useState(false);
  const [query, setQuery] = useState('');

  const items = useMemo(() => inventory.filter((item) =>
    (category === 'All' || item.category === category) &&
    item.title.toLowerCase().includes(query.toLowerCase())
  ), [category, query]);
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const addToCart = (item) => setCart((current) => current.some((entry) => entry.id === item.id) ? current : [...current, item]);

  return <main>
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Found Again home">found <em>again</em></a>
      <nav aria-label="Main navigation">
        <a href="#shop">Shop</a><a href="#how-it-works">How it works</a><button className="text-button" onClick={() => setShowSeller(true)}>For sellers</button>
      </nav>
      <button className="cart-button" onClick={() => setShowCart(true)}>Bag <span>{cart.length}</span></button>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow">SECONDHAND, THOUGHTFULLY CHOSEN</p>
        <h1>Every good thing<br/><i>deserves another</i> beginning.</h1>
        <p className="lede">Books, clothing, home pieces, and small treasures looking for their next story.</p>
        <a className="button" href="#shop">Browse finds <span>→</span></a>
      </div>
      <div className="hero-art" aria-label="A cheerful arrangement of secondhand treasures">
        <div className="sun"></div><div className="arch arch-one"></div><div className="arch arch-two"></div>
        <div className="book-stack"><b>FOUND<br/>AGAIN</b><b>ONCE<br/>MORE</b><b>KEEP</b></div>
        <div className="vase">✳</div><div className="leaf">⌁</div>
      </div>
    </section>

    <section className="value-strip" id="how-it-works">
      <div><span>01</span><p>Thoughtfully<br/>described</p></div><div><span>02</span><p>Fairly<br/>priced</p></div><div><span>03</span><p>Ready for<br/>what's next</p></div>
    </section>

    <section className="shop" id="shop">
      <div className="section-heading"><div><p className="eyebrow">THE CURRENT COLLECTION</p><h2>Find your next favorite.</h2></div><p className="quiet">Every item is one of one.<br/>When it’s gone, it’s gone.</p></div>
      <div className="toolbar">
        <div className="filters">{['All', 'Books', 'Clothing', 'Home', 'Accessories'].map((name) => <button key={name} className={category === name ? 'active' : ''} onClick={() => setCategory(name)}>{name}</button>)}</div>
        <label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" /></label>
      </div>
      <div className="product-grid">{items.map((item) => <article className="product-card" key={item.id}>
        <div className={`product-image ${item.accent}`}><span>{item.tag}</span><div className="object-mark">{item.category === 'Books' ? '▤' : item.category === 'Clothing' ? '⌑' : '✳'}</div></div>
        <div className="product-info"><div><p className="product-category">{item.category} · {item.condition}</p><h3>{item.title}</h3></div><strong>${item.price}</strong></div>
        <p className="product-note">{item.note}</p><button className="add" onClick={() => addToCart(item)}>{cart.some((entry) => entry.id === item.id) ? 'In your bag' : 'Add to bag'} <span>+</span></button>
      </article>)}</div>
    </section>

    <section className="ai-banner"><div><p className="eyebrow">A LITTLE HELP, NOT A HARD SELL</p><h2>Looking for something<br/><i>specific?</i></h2></div><div><p>Tell Found Again what you’re in the mood for, who you’re shopping for, or your budget. Our future AI guide will help you find a meaningful match—or make a bundle.</p><button className="link-button">Meet the guide <span>→</span></button></div></section>

    <footer><a className="wordmark" href="#top">found <em>again</em></a><p>Good things, continued.</p><p>© 2026 Found Again</p></footer>

    {showCart && <aside className="drawer"><button className="close" onClick={() => setShowCart(false)}>×</button><p className="eyebrow">YOUR BAG</p><h2>Almost yours.</h2>{cart.length ? <><div className="bag-items">{cart.map((item) => <div key={item.id}><span className={`mini ${item.accent}`}></span><p>{item.title}<small>{item.condition}</small></p><b>${item.price}</b></div>)}</div><div className="cart-total"><span>Total</span><strong>${total}</strong></div><button className="button checkout">Pay with PayPal <span>→</span></button><p className="sandbox-note">PayPal Sandbox checkout will be connected here.</p></> : <p className="empty">Your next favorite is waiting.</p>}</aside>}
    {showSeller && <aside className="drawer seller"><button className="close" onClick={() => setShowSeller(false)}>×</button><p className="eyebrow">SELLER WORKSPACE</p><h2>Give it another story.</h2><div className="upload-zone"><span>↑</span><b>Add item photos</b><p>AI will help draft the title, condition notes, tags, and description.</p></div><div className="seller-steps"><p><span>1</span> Upload photos and a few notes</p><p><span>2</span> Review the AI draft—nothing publishes without you</p><p><span>3</span> Publish when it feels right</p></div><button className="button">Start a listing <span>→</span></button></aside>}
  </main>
}

createRoot(document.getElementById('root')).render(<App />);
