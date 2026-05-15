const addSeconds = (date, seconds) => {
    return new Date(date.getTime() + seconds * 1000);
};

const nowPlusSeconds = (seconds) => {
    return addSeconds(new Date(), seconds);
};

export default { addSeconds, nowPlusSeconds };
