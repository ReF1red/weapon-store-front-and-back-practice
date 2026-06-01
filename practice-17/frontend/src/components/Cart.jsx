import React from 'react';
import './Cart.css';

export default function Cart({ items, onClose, onCheckout }) {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <div className="cart-overlay" onClick={onClose}>
            <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
                <div className="cart-header">
                    <h3>Корзина</h3>
                    <button className="cart-close" onClick={onClose} title="Закрыть">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div className="cart-items">
                    {items.length === 0 ? (
                        <div className="cart-empty">
                            <p>Корзина пуста</p>
                            <p className="cart-empty-hint">Добавьте оружие из каталога</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="cart-item">
                                <div className="cart-item-info">
                                    <span className="cart-item-name">{item.name}</span>
                                    <span className="cart-item-price">{item.price} руб</span>
                                </div>
                                <div className="cart-item-quantity">
                                    x {item.quantity}
                                </div>
                                <div className="cart-item-total">
                                    {item.price * item.quantity} руб
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                {items.length > 0 && (
                    <>
                        <div className="cart-total">
                            <span>Итого:</span>
                            <span className="cart-total-price">{total} руб</span>
                        </div>
                        <button className="checkout-btn" onClick={onCheckout}>
                            Оформить заказ
                        </button>
                    </>
                )}
                
                <button className="cart-cancel-btn" onClick={onClose}>
                    Продолжить покупки
                </button>
            </div>
        </div>
    );
}