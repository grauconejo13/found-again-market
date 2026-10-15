import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './seller.css';
import './product-grid.css';
import './product-detail.css';

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
  const [products, setProducts] = useState(inventory);
  const [sellerStep, setSellerStep] = useState('welcome');
  const [photoName, setPhotoName] = useState('');
  const [listing, setListing] = useState({ name: '', category: 'Books', condition: 'Gently loved', notes: '', price: '' });
  const [draft, setDraft] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [zoom, setZoom] = useState(1);

  const items = useMemo(() => products.filter((item) =>
    (category === 'All' || item.category === category) &&
    item.title.toLowerCase().includes(query.toLowerCase())
  ), [products, category, query]);
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const addToCart = (item) => setCart((current) => current.some((entry) => entry.id === item.id) ? current : [...current, item]);
  const updateListing = (event) => setListing((current) => ({ ...current, [event.target.name]: event.target.value }));
  const generateDraft = () => {
    const title = listing.name.trim() || `A Found Again ${listing.category.slice(0, -1) || 'Find'}`;
    const tag = listing.category === 'Books' ? 'A new chapter' : listing.category === 'Clothing' ? 'Second season' : 'Freshly found';
    setDraft({ ...listing, title, tag, accent: ['moss', 'butter', 'clay', 'lilac'][products.length % 4], note: listing.notes.trim() || `A thoughtfully chosen ${listing.category.toLowerCase()} ready for its next story.`, price: Number(listing.price) || 12 });
    setSellerStep('review');
  };
  const publishListing = () => {
    setProducts((current) => [{ ...draft, id: Date.now() }, ...current]);
    setSellerStep('published');
  };
  const openProduct = (item) => { setSelectedItem(item); setActivePhoto(0); setZoom(1); };

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
        <button className={`product-image ${item.accent}`} onClick={() => openProduct(item)} aria-label={`View details for ${item.title}`}><span>{item.tag}</span><div className={`object-mark photo-${activePhoto}`}>{item.category === 'Books' ? '▤' : item.category === 'Clothing' ? '⌑' : '✳'}</div><i>View details ↗</i></button>
        <div className="product-info"><div><p className="product-category">{item.category} · {item.condition}</p><h3>{item.title}</h3></div><strong>${item.price}</strong></div>
        <p className="product-note">{item.note}</p><button className="add" onClick={() => addToCart(item)}>{cart.some((entry) => entry.id === item.id) ? 'In your bag' : 'Add to bag'} <span>+</span></button>
      </article>)}</div>
    </section>

    <section className="ai-banner"><div><p className="eyebrow">A LITTLE HELP, NOT A HARD SELL</p><h2>Looking for something<br/><i>specific?</i></h2></div><div><p>Tell Found Again what you’re in the mood for, who you’re shopping for, or your budget. Our future AI guide will help you find a meaningful match—or make a bundle.</p><button className="link-button">Meet the guide <span>→</span></button></div></section>

    <footer><a className="wordmark" href="#top">found <em>again</em></a><p>Good things, continued.</p><p>© 2026 Found Again</p></footer>

    {showCart && <aside className="drawer"><button className="close" onClick={() => setShowCart(false)}>×</button><p className="eyebrow">YOUR BAG</p><h2>Almost yours.</h2>{cart.length ? <><div className="bag-items">{cart.map((item) => <div key={item.id}><span className={`mini ${item.accent}`}></span><p>{item.title}<small>{item.condition}</small></p><b>${item.price}</b></div>)}</div><div className="cart-total"><span>Total</span><strong>${total}</strong></div><button className="button checkout">Pay with PayPal <span>→</span></button><p className="sandbox-note">PayPal Sandbox checkout will be connected here.</p></> : <p className="empty">Your next favorite is waiting.</p>}</aside>}
    {showSeller && <aside className="drawer seller"><button className="close" onClick={() => { setShowSeller(false); setSellerStep('welcome'); }}>×</button><p className="eyebrow">SELLER WORKSPACE</p>
      {sellerStep === 'welcome' && <><h2>Give it another story.</h2><div className="upload-zone"><span>↑</span><b>Add item photos</b><p>AI will help draft the title, condition notes, tags, and description.</p></div><div className="seller-steps"><p><span>1</span> Upload photos and a few notes</p><p><span>2</span> Review the AI draft—nothing publishes without you</p><p><span>3</span> Publish when it feels right</p></div><button className="button" onClick={() => setSellerStep('create')}>Start a listing <span>→</span></button></>}
      {sellerStep === 'create' && <><h2>New listing.</h2><p className="seller-intro">Add the basics. In the finished product, photos will help AI create the first draft.</p><label className="file-picker">{photoName || 'Choose a photo'}<input type="file" accept="image/*" onChange={(event) => setPhotoName(event.target.files?.[0]?.name || '')} /></label><div className="listing-form"><label>Item name<input name="name" value={listing.name} onChange={updateListing} placeholder="e.g. Vintage poetry book" /></label><label>Category<select name="category" value={listing.category} onChange={updateListing}><option>Books</option><option>Clothing</option><option>Home</option><option>Accessories</option></select></label><label>Condition<select name="condition" value={listing.condition} onChange={updateListing}><option>Excellent</option><option>Very good</option><option>Gently loved</option><option>Good</option></select></label><label>Price<input name="price" value={listing.price} onChange={updateListing} type="number" min="1" placeholder="12" /></label><label>Seller notes<textarea name="notes" value={listing.notes} onChange={updateListing} placeholder="A few honest details: color, wear, why someone may love it…" /></label></div><button className="button" onClick={generateDraft}>Generate AI draft <span>→</span></button></>}
      {sellerStep === 'review' && draft && <><h2>Review the draft.</h2><p className="seller-intro">AI gives you a starting point. You remain the editor and decide whether it goes live.</p><div className="draft-card"><span className={`mini ${draft.accent}`}></span><div><p className="product-category">{draft.category} · {draft.condition}</p><h3>{draft.title}</h3><p>{draft.note}</p><b>${draft.price}</b></div></div><div className="seller-actions"><button className="outline-button" onClick={() => setSellerStep('create')}>Edit details</button><button className="button" onClick={publishListing}>Publish listing <span>→</span></button></div></>}
      {sellerStep === 'published' && <><div className="success-mark">✓</div><h2>It’s live.</h2><p className="seller-intro"><b>{draft.title}</b> is now visible in the current collection. That is the seller-to-buyer handoff we’ll show in your hackathon demo.</p><button className="button" onClick={() => { setShowSeller(false); setSellerStep('welcome'); document.getElementById('shop').scrollIntoView(); }}>See it in the shop <span>→</span></button></>}
    </aside>}
    {selectedItem && <div className="product-modal" role="dialog" aria-modal="true" aria-label={`${selectedItem.title} details`}><div className="detail-panel"><button className="close" onClick={() => setSelectedItem(null)}>×</button><div className="detail-gallery"><div className={`detail-image ${selectedItem.accent}`}><div className="zoom-stage" style={{ transform: `scale(${zoom})` }}><div className={`object-mark angle-${activePhoto}`}>{selectedItem.category === 'Books' ? '▤' : selectedItem.category === 'Clothing' ? '⌑' : '✳'}</div></div><p className="image-count">{activePhoto + 1} / 4</p><div className="zoom-controls"><button onClick={() => setZoom((value) => Math.max(1, value - .25))} aria-label="Zoom out">−</button><button onClick={() => setZoom((value) => Math.min(2, value + .25))} aria-label="Zoom in">+</button></div></div><div className="thumbnails">{[0, 1, 2, 3].map((photo) => <button key={photo} className={`${selectedItem.accent} ${activePhoto === photo ? 'chosen' : ''}`} onClick={() => { setActivePhoto(photo); setZoom(1); }} aria-label={`View photo ${photo + 1}`}><span className={`object-mark angle-${photo}`}>{selectedItem.category === 'Books' ? '▤' : selectedItem.category === 'Clothing' ? '⌑' : '✳'}</span></button>)}</div></div><div className="detail-copy"><p className="product-category">{selectedItem.category} · {selectedItem.condition}</p><h2>{selectedItem.title}</h2><p className="detail-price">${selectedItem.price}</p><p>{selectedItem.note}</p><div className="detail-meta"><span>✓ One of one</span><span>✓ Photos reviewed by seller</span><span>✓ Ready for its next story</span></div><button className="button detail-add" onClick={() => { addToCart(selectedItem); setSelectedItem(null); setShowCart(true); }}>Add to bag <span>→</span></button><p className="gallery-note">Gallery demo: replace these four image slots with your own item photos when listing for real.</p></div></div></div>}
  </main>
}

createRoot(document.getElementById('root')).render(<App />);
