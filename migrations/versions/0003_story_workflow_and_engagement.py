from alembic import op
import sqlalchemy as sa

revision = "0003_story_workflow"
down_revision = "0002_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("ck_users_role", type_="check")

    op.execute(sa.text("UPDATE users SET role = 'writer' WHERE role = 'author'"))

    with op.batch_alter_table("users") as batch_op:
        batch_op.create_check_constraint(
            "ck_users_role",
            "role IN ('reader', 'writer', 'admin')",
        )

    op.add_column(
        "blogs",
        sa.Column("author_user_id", sa.Integer(), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE blogs "
            "SET author_user_id = ("
            "SELECT users.id FROM users WHERE users.username = blogs.author_id"
            ") "
            "WHERE blogs.author_id IS NOT NULL"
        )
    )
    op.add_column(
        "blogs",
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default="published",
        ),
    )

    with op.batch_alter_table("blogs") as batch_op:
        batch_op.drop_column("author_id")
        batch_op.alter_column(
            "author_user_id",
            new_column_name="author_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
        batch_op.create_check_constraint(
            "ck_blogs_status",
            "status IN ('draft', 'published')",
        )
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=16),
            existing_nullable=False,
            server_default="draft",
        )

    with op.batch_alter_table("blogs") as batch_op:
        batch_op.create_foreign_key(
            "fk_blogs_author_id_users",
            "users",
            ["author_id"],
            ["id"],
            ondelete="SET NULL",
        )

    op.create_index("ix_blogs_author_id", "blogs", ["author_id"])
    op.create_index("ix_blogs_status", "blogs", ["status"])

    op.create_table(
        "likes",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("blog_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_likes_user_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["blog_id"],
            ["blogs.id"],
            name="fk_likes_blog_id_blogs",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "blog_id", name="pk_likes"),
    )
    op.create_index("ix_likes_blog_id", "likes", ["blog_id"])

    op.create_table(
        "bookmarks",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("blog_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_bookmarks_user_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["blog_id"],
            ["blogs.id"],
            name="fk_bookmarks_blog_id_blogs",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "blog_id", name="pk_bookmarks"),
    )
    op.create_index("ix_bookmarks_blog_id", "bookmarks", ["blog_id"])


def downgrade() -> None:
    op.drop_index("ix_bookmarks_blog_id", table_name="bookmarks")
    op.drop_table("bookmarks")
    op.drop_index("ix_likes_blog_id", table_name="likes")
    op.drop_table("likes")
    op.drop_index("ix_blogs_status", table_name="blogs")
    op.drop_index("ix_blogs_author_id", table_name="blogs")

    op.add_column(
        "blogs",
        sa.Column("author_username", sa.String(length=255), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE blogs "
            "SET author_username = ("
            "SELECT users.username FROM users WHERE users.id = blogs.author_id"
            ") "
            "WHERE blogs.author_id IS NOT NULL"
        )
    )

    with op.batch_alter_table(
        "blogs",
        naming_convention={
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        },
    ) as batch_op:
        batch_op.drop_constraint("fk_blogs_author_id_users", type_="foreignkey")
        batch_op.drop_constraint("ck_blogs_status", type_="check")
        batch_op.drop_column("status")
        batch_op.drop_column("author_id")
        batch_op.alter_column(
            "author_username",
            new_column_name="author_id",
            existing_type=sa.String(length=255),
            nullable=True,
        )

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("ck_users_role", type_="check")

    op.execute(sa.text("UPDATE users SET role = 'author' WHERE role = 'writer'"))

    with op.batch_alter_table("users") as batch_op:
        batch_op.create_check_constraint(
            "ck_users_role",
            "role IN ('reader', 'author', 'admin')",
        )
