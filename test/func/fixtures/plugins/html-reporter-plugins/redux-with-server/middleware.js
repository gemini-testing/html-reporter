module.exports = function(pluginRouter) {
    const nextColors = {
        'red': 'green',
        'green': 'blue',
        'blue': 'red'
    };

    pluginRouter.get('/color', function(req, res) {
        const currentColor = req.query.color || 'red';
        res.send({color: nextColors[currentColor]});
    });
};
