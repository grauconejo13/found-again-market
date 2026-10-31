import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './seller.css';
import './product-grid.css';
import './product-detail.css';
import './shop-guide.css';
import './guide-overrides.css';
import './receipt.css';
import sharkLanyardSetImage from './assets/products/shark-lanyard-set.jpg';
import dadJokesPinImage from './assets/products/dad-jokes-pin.jpg';
import stripedKnitCuffImage from './assets/products/striped-knit-cuff.jpg';
import wovenLeatherCrossbodyImage from './assets/products/woven-leather-crossbody.jpg';
import floralTeacupSetImage from './assets/products/floral-teacup-set.jpg';

const inventory = [
  {
    id: 1,
    title: 'Shark-Print Lanyard & Coin Purse',
    category: 'Accessories',
    condition: 'Very good',
    price: 12,
    accent: 'sky',
    note: 'A playful shark-print lanyard with a matching coin purse and patch.',
    tag: 'Playful carry',
    photos: [sharkLanyardSetImage],
  },
  {
    id: 2,
    title: 'Dad Jokes Novelty Pin',
    category: 'Accessories',
    condition: 'Good',
    price: 5,
    accent: 'butter',
    note: 'A bright little conversation piece for a jacket, bag, or pin board.',
    tag: 'Pocket-sized grin',
    photos: [dadJokesPinImage],
  },
  {
    id: 3,
    title: 'Striped Knit Cuff',
    category: 'Accessories',
    condition: 'Very good',
    price: 10,
    accent: 'lilac',
    note: 'A textured knit cuff with a colorful stripe pattern and soft feel.',
    tag: 'Handmade texture',
    photos: [stripedKnitCuffImage],
  },
  {
    id: 4,
    title: 'Woven Leather Crossbody Bag',
    category: 'Accessories',
    condition: 'Good',
    price: 24,
    accent: 'clay',
    note: 'A colorful woven leather crossbody with an adjustable strap and zipper pockets.',
    tag: 'Everyday carry',
    photos: [wovenLeatherCrossbodyImage],
  },
  {
    id: 5,
    title: 'Hand-Painted Floral Teacup Set',
    category: 'Home',
    condition: 'Excellent',
    price: 18,
    accent: 'butter',
    note: 'A painted floral teacup and matching saucer in cheerful reds, yellow, and aqua.',
    tag: 'Morning ritual',
    photos: [floralTeacupSetImage],
  },
];

const demoPhotosByTitle = new Map(
  inventory.map(({ title, photos }) => [title, photos]),
);

const MAX_LISTING_PHOTOS = 4;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const money = (value) => `$${(Math.round(Number(value || 0) * 100) / 100).toFixed(2)}`;
const sumPrices = (list) =>
  list.reduce((sum, item) => sum + Math.round(Number(item.price) * 100), 0) / 100;
const guidePresets = {
  books: 'I’d love a cozy book to curl up with.',
  bundle:
    'Put together a small, thoughtful bundle of two or three finds that go well together.',
  under25: 'Show me a few lovely finds under $25 total.',
};
const parseApiResponse = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      response.ok
        ? 'We received an unreadable reply. Please try again.'
        : 'We couldn’t reach this service. Please try again in a moment.',
    );
  }
};

function App() {
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('found-again-bag') || '[]');
    } catch {
      return [];
    }
  });
  const [showCart, setShowCart] = useState(false);
  const [showSeller, setShowSeller] = useState(false);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState(inventory);
  const [sellerStep, setSellerStep] = useState('welcome');
  const [photoName, setPhotoName] = useState('');
  const [listingPhotos, setListingPhotos] = useState([]);
  const [sellerError, setSellerError] = useState('');
  const [listing, setListing] = useState({
    name: '',
    category: 'Books',
    condition: 'Gently loved',
    notes: '',
    price: '',
  });
  const [draft, setDraft] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showGuide, setShowGuide] = useState(false);
  const [guideInput, setGuideInput] = useState('');
  const [guideReply, setGuideReply] = useState(
    'Tell me what you’re looking for—a cozy read, a gift, a color, or a budget—and I’ll help you begin. Selling instead? Open For sellers to draft and publish a listing with AI help.',
  );
  const [suggestedBundle, setSuggestedBundle] = useState([]);
  const [bundleLabel, setBundleLabel] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [hold, setHold] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('found-again-hold') || 'null');
    } catch {
      return null;
    }
  });
  const [soldIds, setSoldIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('found-again-sold') || '[]');
    } catch {
      return [];
    }
  });

  const items = useMemo(
    () =>
      products.filter(
        (item) =>
          (category === 'All' || item.category === category) &&
          item.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, category, query],
  );
  const total = sumPrices(cart);
  const holdIsActive = Boolean(hold?.expiresAt > Date.now());
  const availability = (item) =>
    item.availability === 'sold' || soldIds.map(String).includes(String(item.id))
      ? 'sold'
      : (item.availability === 'reserved' &&
            new Date(item.reservedUntil) > new Date()) ||
          (holdIsActive && hold.itemIds.map(String).includes(String(item.id)))
        ? 'held'
        : 'available';
  const availabilityLabel = (item) =>
    availability(item) === 'sold'
      ? 'Sold'
      : availability(item) === 'held'
        ? 'Reserved — checkout in progress'
        : '1 available · one of one';
  const addToCart = (item) => {
    if (availability(item) !== 'available') return;
    setCart((current) =>
      current.some((entry) => entry.id === item.id) ? current : [...current, item],
    );
  };
  const prepareListingPhoto = (file) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      const sourceUrl = URL.createObjectURL(file);
      image.onload = () => {
        const longestEdge = Math.max(image.width, image.height);
        const scale = Math.min(1, 1000 / longestEdge);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#fffdf8';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(sourceUrl);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      image.onerror = () => {
        URL.revokeObjectURL(sourceUrl);
        reject(
          new Error(
            'One of those photos could not be prepared. Please choose another image.',
          ),
        );
      };
      image.src = sourceUrl;
    });
  const chooseListingPhotos = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setSellerError('');
    if (!selectedFiles.length) return;

    if (selectedFiles.length > MAX_LISTING_PHOTOS) {
      setSellerError(`Choose up to ${MAX_LISTING_PHOTOS} photos for one listing.`);
      event.target.value = '';
      return;
    }

    if (selectedFiles.some((file) => !SUPPORTED_IMAGE_TYPES.has(file.type))) {
      setSellerError('Use a JPEG, PNG, or WebP image for this listing.');
      event.target.value = '';
      return;
    }

    const files = selectedFiles;
    setPhotoName(`Preparing ${files.length} photo${files.length === 1 ? '' : 's'}…`);
    try {
      const photos = await Promise.all(files.map(prepareListingPhoto));
      setListingPhotos(photos);
      setPhotoName(`${files.length} photo${files.length === 1 ? '' : 's'} ready`);
    } catch (error) {
      setPhotoName('');
      setListingPhotos([]);
      setSellerError(error.message);
    }
  };
  const updateListing = (event) =>
    setListing((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const generateDraft = async () => {
    setSellerError('');
    if (!listingPhotos.length) {
      setSellerError('Add at least one clear item photo before generating a draft.');
      return;
    }
    setSellerStep('thinking');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'listing',
          listing,
          photos: listingPhotos,
        }),
      });
      const aiDraft = await parseApiResponse(response);
      if (!response.ok)
        throw new Error(aiDraft.error || 'The AI draft could not be created.');
      const title =
        listing.name.trim() ||
        `A Found Again ${listing.category.slice(0, -1) || 'Find'}`;
      const tag =
        listing.category === 'Books'
          ? 'A new chapter'
          : listing.category === 'Clothing'
            ? 'Second season'
            : 'Freshly found';
      setDraft({
        ...listing,
        title: aiDraft.title || title,
        tag,
        accent: ['moss', 'butter', 'clay', 'lilac'][products.length % 4],
        note:
          aiDraft.description ||
          listing.notes.trim() ||
          `A thoughtfully chosen ${listing.category.toLowerCase()} ready for its next story.`,
        price: Number(listing.price) || 12,
        photos: listingPhotos,
        tags: aiDraft.tags || [],
        conditionWording: aiDraft.conditionWording,
        priceRange: aiDraft.priceRange,
        photoObservations: Array.isArray(aiDraft.photoObservations)
          ? aiDraft.photoObservations.slice(0, 3)
          : [],
      });
      setSellerStep('review');
    } catch (error) {
      setSellerStep('create');
      setSellerError(error.message);
    }
  };
  const publishListing = async () => {
    setSellerError('');
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await parseApiResponse(response);
      if (response.ok && data.product)
        setProducts((current) => [data.product, ...current]);
      else if (response.status === 503)
        setProducts((current) => [
          { ...draft, id: Date.now(), availability: 'available' },
          ...current,
        ]);
      else throw new Error(data.error || 'This listing could not be published.');
      setSellerStep('published');
    } catch (error) {
      setSellerError(
        error.message || 'We couldn’t publish this listing. Please try again.',
      );
    }
  };
  const openProduct = (item) => {
    setSelectedItem(item);
    setActivePhoto(0);
    setZoom(1);
  };
  const takeToShop = () =>
    document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
  const addSuggestedBundle = () => {
    suggestedBundle.forEach(addToCart);
    setGuideReply(
      `${suggestedBundle.map((item) => item.title).join(' and ')} are now in your bag. You can still review everything before checkout.`,
    );
    setSuggestedBundle([]);
    setBundleLabel('');
    setShowGuide(false);
    setShowCart(true);
  };
  const startCheckout = async () => {
    if (!cart.length || cart.some((item) => availability(item) !== 'available')) {
      setCheckoutStatus(
        'One of these finds is no longer available. Please refresh your bag.',
      );
      return;
    }
    setCheckoutStatus('Preparing your secure PayPal checkout…');
    try {
      const response = await fetch('/api/paypal/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: cart.map((item) => item.id) }),
      });
      const data = await parseApiResponse(response);
      if (response.status === 409) loadProducts();
      if (!response.ok || !data.approveUrl)
        throw new Error(data.error || 'PayPal checkout is not ready yet.');
      const nextHold = {
        itemIds: cart.map((item) => item.id),
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
      sessionStorage.setItem('found-again-hold', JSON.stringify(nextHold));
      sessionStorage.setItem(
        'found-again-checkout-items',
        JSON.stringify(nextHold.itemIds),
      );
      setHold(nextHold);
      window.location.assign(data.approveUrl);
    } catch (error) {
      setCheckoutStatus(error.message);
    }
  };
  const clearHold = () => {
    sessionStorage.removeItem('found-again-hold');
    sessionStorage.removeItem('found-again-checkout-items');
    setHold(null);
  };
  const clearPayPalParams = () =>
    window.history.replaceState({}, '', window.location.pathname);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('token');
    const outcome = params.get('paypal');
    if (!orderId || !['return', 'cancel'].includes(outcome)) return;
    setShowCart(true);
    if (outcome === 'cancel') {
      setCheckoutStatus(
        'Checkout cancelled. Your finds are back in the collection—nothing was charged.',
      );
      fetch('/api/paypal/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
        .catch(() => {})
        .finally(() => {
          clearHold();
          clearPayPalParams();
          loadProducts();
        });
      return;
    }
    setCheckoutStatus('Confirming your PayPal payment…');
    fetch('/api/paypal/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
      .then(async (response) => ({
        response,
        data: await parseApiResponse(response),
      }))
      .then(({ response, data }) => {
        if (!response.ok) {
          // An expired hold is final for this order: clear it so the buyer can start fresh.
          if (data.holdExpired) {
            clearHold();
            clearPayPalParams();
            loadProducts();
          }
          throw new Error(data.error || 'We could not confirm this payment.');
        }
        const purchasedIds = JSON.parse(
          sessionStorage.getItem('found-again-checkout-items') || '[]',
        ).map(String);
        const nextSold = [...new Set([...soldIds.map(String), ...purchasedIds])];
        sessionStorage.setItem('found-again-sold', JSON.stringify(nextSold));
        clearHold();
        setProducts((current) =>
          current.map((item) =>
            purchasedIds.includes(String(item.id))
              ? { ...item, availability: 'sold' }
              : item,
          ),
        );
        setSoldIds(nextSold);
        setReceipt(data);
        setCart([]);
        setCheckoutStatus('');
        clearPayPalParams();
        loadProducts();
      })
      .catch((error) =>
        setCheckoutStatus(
          `${error.message} If you refresh this page, we’ll safely check again without charging twice.`,
        ),
      );
  }, []);
  useEffect(() => {
    // Keep the bag across the PayPal redirect, without saving large photo data.
    try {
      sessionStorage.setItem(
        'found-again-bag',
        JSON.stringify(
          cart.map(({ id, title, condition, price, accent }) => ({
            id,
            title,
            condition,
            price,
            accent,
          })),
        ),
      );
    } catch {}
  }, [cart]);
  useEffect(() => {
    // Refresh saved bag entries from the live collection and drop anything that has sold.
    setCart((current) =>
      current
        .map(
          (entry) =>
            products.find((item) => String(item.id) === String(entry.id)) || entry,
        )
        .filter((entry) => entry.availability !== 'sold'),
    );
  }, [products]);
  const loadProducts = () =>
    fetch('/api/products')
      .then(async (response) => ({
        response,
        data: await parseApiResponse(response),
      }))
      .then(({ response, data }) => {
        if (response.ok && Array.isArray(data.products)) {
          setProducts(
            data.products.map((product) =>
              product.photos?.length
                ? product
                : {
                    ...product,
                    photos: demoPhotosByTitle.get(product.title) || [],
                  },
            ),
          );
        }
      })
      .catch(() => {});
  useEffect(() => {
    loadProducts();
  }, []);
  const askGuide = async (event, preset) => {
    event?.preventDefault();
    const request = (preset || guideInput).trim();
    if (!request) return;
    setGuideReply('Looking through the current collection…');
    setGuideInput('');
    try {
      const availableProducts = products.filter(
        (item) => availability(item) === 'available',
      );
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'guide',
          prompt: request,
          products: availableProducts,
        }),
      });
      const answer = await parseApiResponse(response);
      if (!response.ok) throw new Error(answer.error || 'The guide could not respond.');
      const suggestedIds = (answer.suggestedIds || []).map(String);
      const suggestions = availableProducts.filter((item) =>
        suggestedIds.includes(String(item.id)),
      );
      setSuggestedBundle(suggestions);
      setBundleLabel(
        suggestions.length ? answer.proposalTitle || 'A thoughtful suggestion' : '',
      );
      setGuideReply(
        answer.reply || 'I found a few possible matches in the collection.',
      );
      takeToShop();
    } catch (error) {
      setGuideReply(error.message);
    }
  };

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Found Again home">
          found <em>again</em>
        </a>
        <nav aria-label="Main navigation">
          <a href="#shop">Shop</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="header-actions">
          <button className="sell-button" onClick={() => setShowSeller(true)}>
            Sell
          </button>
          <button className="cart-button" onClick={() => setShowCart(true)}>
            Bag <span>{cart.length}</span>
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">SECONDHAND, THOUGHTFULLY CHOSEN</p>
          <h1>
            Every good thing
            <br />
            <i>deserves another</i> beginning.
          </h1>
          <p className="lede">
            Books, clothing, home pieces, and small treasures looking for their next
            story.
          </p>
          <a className="button" href="#shop">
            Browse finds <span>→</span>
          </a>
        </div>
        <div className="hero-art" aria-label="Found Again's current collection note">
          <div className="hero-note">
            <p className="eyebrow">THE FOUND AGAIN EDIT · 01</p>
            <span className="note-number">01</span>
            <p className="hero-note-title">
              A collection of
              <br />
              <i>
                things worth keeping
                <br />
                in motion.
              </i>
            </p>
            <div className="hero-note-rule"></div>
            <p className="hero-note-foot">
              ONE-OF-ONE FINDS
              <br />
              CAREFULLY REHOMED
            </p>
          </div>
        </div>
      </section>

      <section className="seller-profile" id="seller-story">
        <div className="seller-profile-heading">
          <p className="eyebrow">FROM THE SELLER</p>
          <h2>Meet Mara.</h2>
        </div>
        <div className="seller-profile-copy">
          <span className="seller-monogram" aria-hidden="true">
            M
          </span>
          <div>
            <p className="seller-quote">
              “I keep the stories, then pass the things along.”
            </p>
            <p>
              A careful re-homer living a long way from any penguins, Mara is selling
              pieces she has loved to help fund a future trip to New Zealand—where she
              hopes to see little penguins and support local conservation work.
            </p>
            <p className="seller-goal">
              <b>Next-story goal</b> · New Zealand little-penguin conservation trip
            </p>
          </div>
        </div>
      </section>

      <section className="value-strip" id="how-it-works">
        <div>
          <span>01</span>
          <p>
            Thoughtfully
            <br />
            described
          </p>
        </div>
        <div>
          <span>02</span>
          <p>
            Fairly
            <br />
            priced
          </p>
        </div>
        <div>
          <span>03</span>
          <p>
            Ready for
            <br />
            what's next
          </p>
        </div>
      </section>

      <section className="shop" id="shop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE CURRENT COLLECTION</p>
            <h2>Find your next favorite.</h2>
          </div>
          <p className="quiet">
            Every item is one of one.
            <br />
            When it’s gone, it’s gone.
          </p>
        </div>
        <div className="toolbar">
          <div className="filters">
            {['All', 'Books', 'Clothing', 'Home', 'Accessories'].map((name) => (
              <button
                key={name}
                className={category === name ? 'active' : ''}
                onClick={() => setCategory(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <label className="search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the collection"
            />
          </label>
        </div>
        <div className="product-grid">
          {items.map((item) => (
            <article className="product-card" key={item.id}>
              <button
                className={`product-image ${item.accent}`}
                onClick={() => openProduct(item)}
                aria-label={`View details for ${item.title}`}
              >
                <span>{item.tag}</span>
                <b className={`availability ${availability(item)}`}>
                  {availabilityLabel(item)}
                </b>
                {item.photos?.[0] ? (
                  <img src={item.photos[0]} alt="" />
                ) : (
                  <div className={`object-mark photo-${activePhoto}`}>
                    {item.category === 'Books'
                      ? '▤'
                      : item.category === 'Clothing'
                        ? '⌑'
                        : '✳'}
                  </div>
                )}
                <i>View details ↗</i>
              </button>
              <div className="product-info">
                <div>
                  <p className="product-category">
                    {item.category} · {item.condition}
                  </p>
                  <h3>{item.title}</h3>
                </div>
                <strong>{money(item.price)}</strong>
              </div>
              <p className="product-note">{item.note}</p>
              <button
                className="add"
                disabled={availability(item) !== 'available'}
                onClick={() => {
                  addToCart(item);
                  setShowCart(true);
                }}
              >
                {availability(item) === 'sold'
                  ? 'Sold'
                  : availability(item) === 'held'
                    ? 'Reserved'
                    : cart.some((entry) => entry.id === item.id)
                      ? 'In your bag'
                      : 'Add to bag'}{' '}
                <span>{availability(item) === 'available' ? '+' : '—'}</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="ai-banner">
        <div>
          <p className="eyebrow">A LITTLE HELP, NOT A HARD SELL</p>
          <h2>
            Looking for something
            <br />
            <i>specific?</i>
          </h2>
        </div>
        <div>
          <p>
            Tell Found Again what you’re in the mood for, who you’re shopping for, or
            your budget. The Found Again guide reads the live collection and proposes a
            meaningful match or a small bundle—with the total shown up front. Nothing
            goes in your bag until you say so.
          </p>
          <button className="link-button" onClick={() => setShowGuide(true)}>
            Meet the guide <span>→</span>
          </button>
        </div>
      </section>

      <footer>
        <a className="wordmark" href="#top">
          found <em>again</em>
        </a>
        <p>Good things, continued.</p>
        <p>© 2026 Found Again</p>
      </footer>

      {showCart && (
        <aside className="drawer">
          <button className="close" onClick={() => setShowCart(false)}>
            ×
          </button>
          <p className="eyebrow">{receipt ? 'ORDER CONFIRMED' : 'YOUR BAG'}</p>
          <h2>{receipt ? 'It’s yours.' : 'Almost yours.'}</h2>
          {receipt ? (
            <div className="receipt">
              <p>Thank you for giving a good thing another beginning.</p>
              <p>
                Receipt <b>{receipt.receiptId}</b>
              </p>
              <p>Paid with PayPal Sandbox · {money(receipt.amount)}</p>
              <button className="outline-button" onClick={() => window.print()}>
                Print / save receipt
              </button>
            </div>
          ) : cart.length ? (
            <>
              <div className="bag-items">
                {cart.map((item) => (
                  <div key={item.id}>
                    <span className={`mini ${item.accent}`}></span>
                    <p>
                      {item.title}
                      <small>{item.condition}</small>
                    </p>
                    <b>{money(item.price)}</b>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
              <button className="button checkout" onClick={startCheckout}>
                Pay with PayPal <span>→</span>
              </button>
              <p className="sandbox-note">
                Your bag does not reserve one-of-one finds. A 10-minute hold begins only
                after PayPal checkout opens. {checkoutStatus}
              </p>
            </>
          ) : (
            <p className="empty">
              {checkoutStatus || 'Your next favorite is waiting.'}
            </p>
          )}
        </aside>
      )}
      {showSeller && (
        <aside className="drawer seller">
          <button
            className="close"
            onClick={() => {
              setShowSeller(false);
              setSellerStep('welcome');
            }}
          >
            ×
          </button>
          <p className="eyebrow">SELLER WORKSPACE</p>
          {sellerStep === 'welcome' && (
            <>
              <h2>Give it another story.</h2>
              <div className="upload-zone">
                <span>↑</span>
                <b>Add item photos</b>
                <p>
                  Add up to four photos, then use AI to draft the title, condition
                  notes, tags, and description from your honest details.
                </p>
              </div>
              <div className="seller-steps">
                <p>
                  <span>1</span> Upload photos and a few notes
                </p>
                <p>
                  <span>2</span> Review the AI draft—nothing publishes without you
                </p>
                <p>
                  <span>3</span> Publish when it feels right
                </p>
              </div>
              <button className="button" onClick={() => setSellerStep('create')}>
                Start a listing <span>→</span>
              </button>
            </>
          )}
          {sellerStep === 'create' && (
            <>
              <h2>New listing.</h2>
              <p className="seller-intro">
                Start with at least one photo and the basics. Buyers see your photos; AI
                reviews clearly visible details alongside your written notes for an
                honest first draft.
              </p>
              <label className="file-picker">
                <span>{photoName || 'Choose 1–4 item photos'}</span>
                <small>JPEG, PNG, or WebP · the first photo becomes the cover</small>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={chooseListingPhotos}
                />
              </label>
              {listingPhotos.length > 0 && (
                <div className="listing-photo-preview">
                  {listingPhotos.map((photo, index) => (
                    <img key={photo} src={photo} alt={`Listing preview ${index + 1}`} />
                  ))}
                </div>
              )}
              <div className="listing-form">
                <label>
                  Item name
                  <input
                    name="name"
                    value={listing.name}
                    onChange={updateListing}
                    placeholder="e.g. Vintage poetry book"
                  />
                </label>
                <label>
                  Category
                  <select
                    name="category"
                    value={listing.category}
                    onChange={updateListing}
                  >
                    <option>Books</option>
                    <option>Clothing</option>
                    <option>Home</option>
                    <option>Accessories</option>
                  </select>
                </label>
                <label>
                  Condition
                  <select
                    name="condition"
                    value={listing.condition}
                    onChange={updateListing}
                  >
                    <option>Excellent</option>
                    <option>Very good</option>
                    <option>Gently loved</option>
                    <option>Good</option>
                  </select>
                </label>
                <label>
                  Price
                  <input
                    name="price"
                    value={listing.price}
                    onChange={updateListing}
                    type="number"
                    min="1"
                    placeholder="12"
                  />
                </label>
                <label>
                  Seller notes
                  <textarea
                    name="notes"
                    value={listing.notes}
                    onChange={updateListing}
                    placeholder="A few honest details: color, wear, why someone may love it…"
                  />
                </label>
              </div>
              {sellerError && (
                <p className="seller-error" role="alert">
                  {sellerError}
                </p>
              )}
              <button
                className="button"
                disabled={!listingPhotos.length}
                onClick={generateDraft}
              >
                {listingPhotos.length ? 'Generate AI draft' : 'Add a photo to continue'}{' '}
                <span>→</span>
              </button>
            </>
          )}
          {sellerStep === 'thinking' && (
            <>
              <h2>Drafting with care.</h2>
              <p className="seller-intro">
                The AI is reviewing your notes and the clearly visible details in your
                photos.
              </p>
            </>
          )}
          {sellerStep === 'review' && draft && (
            <>
              <h2>Review the draft.</h2>
              <p className="seller-intro">
                AI gives you a starting point. You remain the editor and decide whether
                it goes live.
              </p>
              <div className="draft-card">
                {draft.photos?.[0] ? (
                  <img
                    className="draft-photo"
                    src={draft.photos[0]}
                    alt="Listing preview"
                  />
                ) : (
                  <span className={`mini ${draft.accent}`}></span>
                )}
                <div>
                  <p className="product-category">
                    {draft.category} · {draft.condition}
                  </p>
                  <h3>{draft.title}</h3>
                  <p>{draft.note}</p>
                  <b>{money(draft.price)}</b>
                  {draft.priceRange && (
                    <p className="draft-ai-note">AI price range: {draft.priceRange}</p>
                  )}
                </div>
              </div>
              {draft.photoObservations?.length > 0 && (
                <div className="photo-check">
                  <p className="product-category">
                    AI photo check · confirm before publishing
                  </p>
                  <ul>
                    {draft.photoObservations.map((observation) => (
                      <li key={observation}>{observation}</li>
                    ))}
                  </ul>
                  <p>
                    Only clearly visible details are included. Edit the listing if
                    anything is incomplete or incorrect.
                  </p>
                </div>
              )}
              {draft.photos?.length > 1 && (
                <p className="seller-photo-count">
                  {draft.photos.length} listing photos ready for buyers to view.
                </p>
              )}
              {sellerError && (
                <p className="seller-error" role="alert">
                  {sellerError}
                </p>
              )}
              <div className="seller-actions">
                <button
                  className="outline-button"
                  onClick={() => setSellerStep('create')}
                >
                  Edit details
                </button>
                <button className="button" onClick={publishListing}>
                  Publish listing <span>→</span>
                </button>
              </div>
            </>
          )}
          {sellerStep === 'published' && (
            <>
              <div className="success-mark">✓</div>
              <h2>It’s live.</h2>
              <p className="seller-intro">
                <b>{draft.title}</b> is now visible in the current collection. Preview
                the buyer journey next: view the item, add it to a bag, then choose
                PayPal checkout.
              </p>
              <button
                className="button"
                onClick={() => {
                  setShowSeller(false);
                  setSellerStep('welcome');
                  document.getElementById('shop').scrollIntoView();
                }}
              >
                Preview in shop <span>→</span>
              </button>
            </>
          )}
        </aside>
      )}
      {selectedItem && (
        <div
          className="product-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedItem.title} details`}
        >
          <div className="detail-panel">
            <button className="close" onClick={() => setSelectedItem(null)}>
              ×
            </button>
            <div className="detail-gallery">
              <div className={`detail-image ${selectedItem.accent}`}>
                <div className="zoom-stage" style={{ transform: `scale(${zoom})` }}>
                  {selectedItem.photos?.[activePhoto] ? (
                    <img
                      className="detail-listing-photo"
                      src={selectedItem.photos[activePhoto]}
                      alt={`${selectedItem.title}, view ${activePhoto + 1}`}
                    />
                  ) : (
                    <div className={`object-mark angle-${activePhoto}`}>
                      {selectedItem.category === 'Books'
                        ? '▤'
                        : selectedItem.category === 'Clothing'
                          ? '⌑'
                          : '✳'}
                    </div>
                  )}
                </div>
                <p className="image-count">
                  {activePhoto + 1} / {selectedItem.photos?.length || 4}
                  {selectedItem.photos?.length ? '' : ' · illustrated views'}
                </p>
                <div className="zoom-controls">
                  <button
                    onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
                    aria-label="Zoom out"
                  >
                    −
                  </button>
                  <button
                    onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="thumbnails">
                {Array.from(
                  { length: selectedItem.photos?.length || 4 },
                  (_, photo) => (
                    <button
                      key={photo}
                      className={`${selectedItem.accent} ${activePhoto === photo ? 'chosen' : ''}`}
                      onClick={() => {
                        setActivePhoto(photo);
                        setZoom(1);
                      }}
                      aria-label={`View photo ${photo + 1}`}
                    >
                      {selectedItem.photos?.[photo] ? (
                        <img src={selectedItem.photos[photo]} alt="" />
                      ) : (
                        <span className={`object-mark angle-${photo}`}>
                          {selectedItem.category === 'Books'
                            ? '▤'
                            : selectedItem.category === 'Clothing'
                              ? '⌑'
                              : '✳'}
                        </span>
                      )}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="detail-copy">
              <p className="product-category">
                {selectedItem.category} · {selectedItem.condition}
              </p>
              <h2>{selectedItem.title}</h2>
              <p className="detail-price">{money(selectedItem.price)}</p>
              <p>{selectedItem.note}</p>
              <div className="detail-meta">
                <span>✓ {availabilityLabel(selectedItem)}</span>
                <span>✓ Photos reviewed by seller</span>
                <span>✓ Ready for its next story</span>
              </div>
              <button
                className="button detail-add"
                disabled={availability(selectedItem) !== 'available'}
                onClick={() => {
                  addToCart(selectedItem);
                  setSelectedItem(null);
                  setShowCart(true);
                }}
              >
                {availability(selectedItem) === 'available'
                  ? 'Add to bag'
                  : availability(selectedItem) === 'sold'
                    ? 'Sold'
                    : 'Reserved'}{' '}
                <span>→</span>
              </button>
              <p className="gallery-note">
                Your seller-uploaded photos appear here for buyers to inspect and zoom.
              </p>
            </div>
          </div>
        </div>
      )}
      <button
        className="guide-fab"
        onClick={() => setShowGuide((open) => !open)}
        aria-label="Open Found Again guide"
      >
        <span>✦</span>
        <small>Ask</small>
      </button>
      {showGuide && (
        <aside className="shop-guide" aria-label="Found Again shopping guide">
          <button className="guide-close" onClick={() => setShowGuide(false)}>
            ×
          </button>
          <div className="guide-head">
            <span>✦</span>
            <div>
              <p className="eyebrow">FOUND AGAIN GUIDE</p>
              <h2>
                A small nudge
                <br />
                <i>in the right direction.</i>
              </h2>
            </div>
          </div>
          <p className="guide-reply">{guideReply}</p>
          {suggestedBundle.length > 0 && (
            <div className="bundle-proposal">
              <p>{bundleLabel}</p>
              <strong>{suggestedBundle.map((item) => item.title).join(' + ')}</strong>
              <span className="bundle-total">
                {money(sumPrices(suggestedBundle))} · Nothing added yet
              </span>
              <button onClick={addSuggestedBundle}>
                {suggestedBundle.length === 1
                  ? 'Add this find to my bag'
                  : 'Add these finds to my bag'}{' '}
                →
              </button>
            </div>
          )}
          <div className="guide-prompts">
            <button onClick={() => askGuide(null, guidePresets.books)}>
              Find a cozy book
            </button>
            <button onClick={() => askGuide(null, guidePresets.bundle)}>
              Build a small bundle
            </button>
            <button onClick={() => askGuide(null, guidePresets.under25)}>
              Show finds under $25
            </button>
          </div>
          <form onSubmit={askGuide}>
            <input
              value={guideInput}
              onChange={(event) => setGuideInput(event.target.value)}
              placeholder="What are you looking for?"
            />
            <button type="submit">→</button>
          </form>
          <p className="guide-disclosure">
            Recommendations are suggestions. You always choose the items and approve the
            final total before PayPal checkout.
          </p>
        </aside>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
