module.exports = function(sequelize, DataTypes) {
    var Show = sequelize.define("Show", {
        id: {type: DataTypes.INTEGER, primaryKey: true, allowNull: false},
        imdb_id: {type: DataTypes.STRING, allowNull: false, unique: true},
        name: {type: DataTypes.STRING, allowNull: false},
        genre: DataTypes.STRING,
        started: DataTypes.DATEONLY,
        ended: DataTypes.DATEONLY,
        air_day: DataTypes.STRING,
        air_time: DataTypes.STRING,
        status: {type: DataTypes.STRING, allowNull: false},
        image: DataTypes.STRING
    }, {
        classMethods: {
            associate: function(models) {
                Show.hasMany(models.Episode, { as: 'episodes' });
                Show.belongsToMany(models.User, { through: models.UserShow });
            }
        },
        
        timestamps: true,
        createdAt: false,
        
    });
    return Show;
};

