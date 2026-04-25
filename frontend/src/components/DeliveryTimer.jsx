import React, { useState, useEffect } from 'react';

const DeliveryTimer = ({ placedAt }) => {
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes = 600s

    useEffect(() => {
        if (!placedAt) return;
        const orderTime = new Date(placedAt).getTime();

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const differenceInSeconds = Math.floor((now - orderTime) / 1000);
            const remaining = 600 - differenceInSeconds;

            if (remaining <= 0) {
                clearInterval(interval);
                setTimeLeft(0);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [placedAt]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="p-4 bg-green-100 rounded-lg text-center mt-4">
            <h3 className="text-xl font-bold text-green-700 mb-2">10 Minute Delivery</h3>
            <div className="text-3xl font-mono text-green-800">
                {timeLeft > 0 ? (
                    `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
                ) : (
                    'Arriving Now or Delivered!'
                )}
            </div>
            {timeLeft > 0 && <p className="text-sm text-green-600 mt-2">Your rider is on the way.</p>}
        </div>
    );
};

export default DeliveryTimer;
